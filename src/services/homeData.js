import { collection, getDocs } from 'firebase/firestore';

import { auth, db } from './firebase.js';
import { getPocketBase } from './pocketbase.js';
import { seedCourses } from '../data/seedCourses.js';
import { seedMentors } from '../data/seedMentors.js';
import { seedCategories } from '../data/seedCategories.js';

const COURSE_COLLECTION = 'courses';
const MENTOR_COLLECTION = 'mentors';
const SAVED_COURSES_KEY = 'levelup_saved_courses_v1';
const RANK_OFFSET = 1000;
const courseInvalidationSubscribers = new Set();
const mentorInvalidationSubscribers = new Set();

function notifyInvalidation(subscribers) {
  for (const listener of Array.from(subscribers)) {
    try {
      listener?.();
    } catch {
      // no-op
    }
  }
}

function subscribeInvalidation(subscribers, listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function looksLikeUrl(value = '') {
  return value.startsWith('http://') || value.startsWith('https://');
}

function toInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toNullableInt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSections(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sanitizeSections(sections = []) {
  if (!Array.isArray(sections)) return [];
  const result = [];
  for (const section of sections) {
    const title = `${section?.title || ''}`.trim();
    if (!title) continue;
    const lessons = [];
    const sourceLessons = Array.isArray(section?.lessons) ? section.lessons : [];
    for (const lesson of sourceLessons) {
      const lessonTitle = `${lesson?.title || ''}`.trim();
      if (!lessonTitle) continue;
      lessons.push({
        title: lessonTitle,
        videoUrl: `${lesson?.videoUrl || ''}`.trim(),
      });
    }
    result.push({ title, lessons });
  }
  return result;
}

function extractFileNames(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function findNewFileName(previous = new Set(), current = []) {
  for (const name of current) {
    if (!previous.has(name)) return name;
  }
  return current[current.length - 1] || '';
}

function escapeFileName(name = '') {
  return `${name}`.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
}

function buildLessonVideoFileName(fileName = '', sectionIndex = 0, lessonIndex = 0) {
  const base = `${fileName}`.trim() || 'video.mp4';
  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot + 1) : 'mp4';
  const name = dot > 0 ? base.slice(0, dot) : base;
  const safe = escapeFileName(name) || 'video';
  const stamp = Date.now();
  return `lesson_s${sectionIndex + 1}_l${lessonIndex + 1}_${stamp}_${safe}.${ext}`;
}

function replaceLessonVideoUrl(sections = [], sectionIndex = 0, lessonIndex = 0, url = '') {
  if (!Array.isArray(sections)) return sections;
  if (sectionIndex < 0 || sectionIndex >= sections.length) return sections;
  const targetSection = sections[sectionIndex];
  const sourceLessons = Array.isArray(targetSection?.lessons) ? targetSection.lessons : [];
  if (lessonIndex < 0 || lessonIndex >= sourceLessons.length) return sections;

  const nextSections = sections.map((section) => ({
    ...section,
    lessons: Array.isArray(section.lessons) ? section.lessons.map((lesson) => ({ ...lesson })) : [],
  }));
  nextSections[sectionIndex].lessons[lessonIndex].videoUrl = `${url || ''}`.trim();
  return nextSections;
}

async function uploadRecordFileWithProgress(pb, { collection, recordId, field, file, filename, onProgress }) {
  const formData = new FormData();
  formData.append(field, file, filename);
  const token = pb.authStore?.token || '';
  const url = `${pb.baseUrl}/api/collections/${collection}/records/${recordId}`;
  onProgress?.(0, file.size || 0);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object') {
    const message = data?.message || 'Failed to upload lesson video.';
    throw new Error(message);
  }
  onProgress?.(file.size || 0, file.size || 0);
  return data;
}

async function uploadLessonVideos(pb, { record, sections, uploads = [], onProgress }) {
  let updatedSections = sections;
  let currentRecord = record;
  let knownFiles = new Set(extractFileNames(record?.lessonVideos));

  for (const upload of uploads) {
    const filename = buildLessonVideoFileName(
      upload?.file?.name || '',
      upload?.sectionIndex || 0,
      upload?.lessonIndex || 0
    );
    const updatedRecord = await uploadRecordFileWithProgress(pb, {
      collection: COURSE_COLLECTION,
      recordId: currentRecord.id,
      // Use "+" to append on multi-file field instead of replacing previous files.
      field: 'lessonVideos+',
      file: upload.file,
      filename,
      onProgress: (sentBytes, totalBytes) => {
        onProgress?.({
          sectionIndex: upload.sectionIndex,
          lessonIndex: upload.lessonIndex,
          sentBytes,
          totalBytes,
          progress: totalBytes > 0 ? sentBytes / totalBytes : 1,
        });
      },
    });
    const currentFiles = extractFileNames(updatedRecord.lessonVideos);
    const resolvedFile = findNewFileName(knownFiles, currentFiles);
    knownFiles = new Set(currentFiles);
    if (!resolvedFile) continue;
    const resolvedUrl = pb.files.getUrl(updatedRecord, resolvedFile);
    updatedSections = replaceLessonVideoUrl(
      updatedSections,
      upload.sectionIndex,
      upload.lessonIndex,
      `${resolvedUrl || ''}`.trim()
    );
    currentRecord = updatedRecord;
  }

  return updatedSections;
}

function resolveFileUrl(pb, record, value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (looksLikeUrl(trimmed)) return trimmed;
    return pb.files.getUrl(record, trimmed);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim();
      if (!trimmed) continue;
      if (looksLikeUrl(trimmed)) return trimmed;
      return pb.files.getUrl(record, trimmed);
    }
  }
  return '';
}

function readSavedCourseIds() {
  try {
    const raw = localStorage.getItem(SAVED_COURSES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((item) => `${item}`));
  } catch {
    return new Set();
  }
}

function writeSavedCourseIds(ids) {
  localStorage.setItem(SAVED_COURSES_KEY, JSON.stringify(Array.from(ids)));
}

function applySavedMarks(courses) {
  const savedIds = readSavedCourseIds();
  return (courses || []).map((course) => ({
    ...course,
    bookmarked: savedIds.has(`${course.id}`),
  }));
}

function orderFeaturedCourses(courses = []) {
  if (!Array.isArray(courses) || courses.length === 0) return [];
  const sourceIndex = Object.fromEntries(courses.map((item, index) => [item.id, index]));
  const ranked = [];
  const unranked = [];

  for (const course of courses) {
    if ((course.featuredRank || 0) > 0) {
      ranked.push(course);
    } else {
      unranked.push(course);
    }
  }

  const compareNewest = (left, right) => {
    const a = left?.createdAt ? new Date(left.createdAt) : null;
    const b = right?.createdAt ? new Date(right.createdAt) : null;
    if (a && b) {
      const byDate = b.getTime() - a.getTime();
      if (byDate !== 0) return byDate;
    } else if (a) {
      return -1;
    } else if (b) {
      return 1;
    }
    return (sourceIndex[left.id] ?? RANK_OFFSET) - (sourceIndex[right.id] ?? RANK_OFFSET);
  };

  unranked.sort(compareNewest);
  ranked.sort((left, right) => {
    const a = left.featuredRank ?? RANK_OFFSET;
    const b = right.featuredRank ?? RANK_OFFSET;
    if (a !== b) return a - b;
    return compareNewest(left, right);
  });

  return [...unranked, ...ranked];
}

function orderFeaturedMentors(mentors = []) {
  if (!Array.isArray(mentors) || mentors.length === 0) return [];
  const hasRank = mentors.some((mentor) => (mentor.featuredRank || 0) > 0);
  if (!hasRank) return mentors.slice();
  const sorted = mentors.slice();
  sorted.sort((left, right) => {
    const a = left.featuredRank ?? RANK_OFFSET;
    const b = right.featuredRank ?? RANK_OFFSET;
    if (a !== b) return a - b;
    return `${left.name || ''}`.toLowerCase().localeCompare(`${right.name || ''}`.toLowerCase());
  });
  return sorted;
}

function mapCourse(pb, record) {
  const data = { ...record };
  const cover = `${data.coverImageUrl || data.coverImagePath || ''}`.trim();
  const mentorImage = `${data.mentorImageUrl || data.mentorImagePath || ''}`.trim();
  const sections = sanitizeSections(normalizeSections(data.sections));

  return {
    id: record.id,
    category: `${data.category || ''}`.trim(),
    title: `${data.title || ''}`.trim(),
    mentorName: `${data.mentorName || ''}`.trim(),
    mentorSubtitle: `${data.mentorSubtitle || ''}`.trim(),
    mentorImagePath: mentorImage || resolveFileUrl(pb, record, data.mentorImage),
    coverImagePath: cover || resolveFileUrl(pb, record, data.coverImage),
    mentorId: `${data.mentorId || ''}`.trim() || null,
    price: `${data.price || ''}`.trim(),
    oldPrice: `${data.oldPrice || ''}`.trim(),
    rating: `${data.rating || ''}`.trim(),
    students: `${data.students || ''}`.trim(),
    classes: toInt(data.classes),
    hours: toInt(data.hours),
    bookmarked: Boolean(data.bookmarked),
    sections,
    featuredRank: toNullableInt(
      data.featuredRank ?? data.featured_rank ?? data.homeRank ?? data.home_rank ?? data.popularRank ?? data.popular_rank
    ),
    createdAt: `${data.created || record.created || ''}`.trim() || null,
  };
}

function mapMentor(pb, record) {
  const data = { ...record };
  const image = `${data.imageUrl || data.imagePath || ''}`.trim();
  return {
    id: record.id,
    name: `${data.name || ''}`.trim(),
    category: `${data.category || ''}`.trim(),
    subtitle: `${data.subtitle || ''}`.trim(),
    courses: `${data.courses || '0'}`.trim(),
    students: `${data.students || '0'}`.trim(),
    ratings: `${data.ratings || '0'}`.trim(),
    imagePath: image || resolveFileUrl(pb, record, data.image),
    bio: `${data.bio || ''}`.trim(),
    featuredRank: toNullableInt(
      data.featuredRank ?? data.featured_rank ?? data.homeRank ?? data.home_rank ?? data.topRank ?? data.top_rank
    ),
  };
}

function normalizeMentorFromFirestore(doc) {
  const data = doc.data() || {};
  const category = `${data.category || ''}`.trim() || 'General';
  const subtitle = `${data.subtitle || ''}`.trim() || `${category} Mentor`;
  const imagePath = (
    data.imageUrl ||
    data.imagePath ||
    data.avatarUrl ||
    data.photoUrl ||
    data.image ||
    data.photo ||
    data.avatar ||
    ''
  )
    .toString()
    .trim();

  return {
    id: doc.id,
    name: `${data.name || ''}`.trim(),
    category,
    subtitle,
    courses: `${data.courses || '0'}`.trim(),
    students: `${data.students || '0'}`.trim(),
    ratings: `${data.ratings || '0'}`.trim(),
    imagePath,
    bio: `${data.bio || ''}`.trim(),
    featuredRank: toNullableInt(data.featuredRank ?? data.featured_rank ?? null),
  };
}

async function fetchFirestoreMentors() {
  if (!auth?.currentUser || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'mentors'));
    return snapshot.docs.map((docItem) => normalizeMentorFromFirestore(docItem));
  } catch {
    return [];
  }
}

function mergeFirestoreMentors(base, fromFirestore) {
  if (!fromFirestore.length) return base.slice();
  const byName = new Map(base.map((item) => [item.name.trim().toLowerCase(), item]));

  for (const cloudMentor of fromFirestore) {
    const key = cloudMentor.name.trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, cloudMentor);
      continue;
    }
    byName.set(key, {
      ...existing,
      category: existing.category || cloudMentor.category,
      subtitle: existing.subtitle || cloudMentor.subtitle,
      imagePath: cloudMentor.imagePath || existing.imagePath,
      bio: cloudMentor.bio || existing.bio,
    });
  }
  return Array.from(byName.values());
}

async function fetchProfileImageOverlays(pb) {
  try {
    const records = await pb.collection(MENTOR_COLLECTION).getFullList({
      filter: 'category="__profile__"',
      sort: '-updated',
    });
    const overlays = {};
    for (const record of records) {
      const name = `${record.name || ''}`.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (overlays[key]) continue;
      const image = resolveFileUrl(pb, record, record.image);
      const direct = `${record.imageUrl || ''}`.trim();
      const resolved = image || direct;
      if (!resolved) continue;
      overlays[key] = resolved;
    }
    return overlays;
  } catch {
    return {};
  }
}

function applyProfileImageOverlays(mentors, overlays) {
  if (!Object.keys(overlays).length) return mentors;
  return mentors.map((mentor) => {
    const overlay = overlays[mentor.name.trim().toLowerCase()] || '';
    if (!overlay) return mentor;
    return { ...mentor, imagePath: overlay };
  });
}

function dedupeMentorsByName(items) {
  const seen = new Set();
  const result = [];
  for (const mentor of items) {
    const key = mentor.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(mentor);
  }
  return result;
}

function sanitizeCoursePayload(course = {}) {
  return {
    category: `${course.category || ''}`.trim(),
    title: `${course.title || ''}`.trim(),
    mentorName: `${course.mentorName || ''}`.trim(),
    mentorSubtitle: `${course.mentorSubtitle || ''}`.trim(),
    mentorImageUrl: `${course.mentorImagePath || ''}`.trim(),
    coverImageUrl: `${course.coverImagePath || ''}`.trim(),
    mentorId: `${course.mentorId || ''}`.trim(),
    price: `${course.price || ''}`.trim(),
    oldPrice: `${course.oldPrice || ''}`.trim(),
    rating: `${course.rating || ''}`.trim(),
    students: `${course.students || ''}`.trim(),
    classes: toInt(course.classes),
    hours: toInt(course.hours),
    bookmarked: Boolean(course.bookmarked),
    sections: sanitizeSections(course.sections),
    featuredRank: toNullableInt(course.featuredRank),
  };
}

function sanitizeMentorPayload(mentor = {}) {
  return {
    name: `${mentor.name || ''}`.trim(),
    category: `${mentor.category || ''}`.trim() || 'General',
    subtitle: `${mentor.subtitle || ''}`.trim() || `${mentor.category || 'General'} Mentor`,
    courses: `${mentor.courses || '0'}`.trim(),
    students: `${mentor.students || '0'}`.trim(),
    ratings: `${mentor.ratings || '0'}`.trim(),
    imageUrl: `${mentor.imagePath || ''}`.trim(),
    bio: `${mentor.bio || ''}`.trim(),
    featuredRank: toNullableInt(mentor.featuredRank),
  };
}

export function buildCategories(courses) {
  const categories = [];
  const seen = new Set();
  (courses || []).forEach((course) => {
    const category = (course.category || '').trim();
    if (!category || seen.has(category)) return;
    seen.add(category);
    categories.push(category);
  });
  return categories.length ? categories : seedCategories.slice();
}

export async function fetchCourses() {
  const pb = getPocketBase();
  try {
    const records = await pb.collection(COURSE_COLLECTION).getFullList({ sort: '-created' });
    const mapped = records.map((record) => mapCourse(pb, record));
    const source = mapped.length ? mapped : seedCourses.slice();
    const ordered = orderFeaturedCourses(source);
    return applySavedMarks(ordered);
  } catch {
    return applySavedMarks(orderFeaturedCourses(seedCourses.slice()));
  }
}

export async function fetchMentors() {
  const pb = getPocketBase();
  try {
    const [records, firestoreMentors, overlays] = await Promise.all([
      pb.collection(MENTOR_COLLECTION).getFullList({ sort: '-created' }),
      fetchFirestoreMentors(),
      fetchProfileImageOverlays(pb),
    ]);

    const mapped = records
      .map((record) => mapMentor(pb, record))
      .filter((mentor) => mentor.category.trim() !== '__profile__');
    const withFirestore = mergeFirestoreMentors(mapped, firestoreMentors);
    const withOverlays = applyProfileImageOverlays(withFirestore, overlays);
    const deduped = dedupeMentorsByName(withOverlays);
    const source = deduped.length ? deduped : seedMentors.slice();
    return orderFeaturedMentors(source);
  } catch {
    return orderFeaturedMentors(seedMentors.slice());
  }
}

export function invalidateCoursesQuery() {
  notifyInvalidation(courseInvalidationSubscribers);
}

export function invalidateMentorsQuery() {
  notifyInvalidation(mentorInvalidationSubscribers);
}

export async function subscribeCourses(onChange, onError) {
  const unsubscribeInvalidation = subscribeInvalidation(
    courseInvalidationSubscribers,
    onChange
  );
  const pb = getPocketBase();
  let unsubscribeRealtime = () => {};
  try {
    const unsubscribe = await pb.collection(COURSE_COLLECTION).subscribe('*', () => {
      onChange?.();
    });
    unsubscribeRealtime = () => {
      try {
        unsubscribe?.();
      } catch {
        // no-op
      }
    };
  } catch (error) {
    onError?.(error);
  }

  return () => {
    unsubscribeInvalidation();
    unsubscribeRealtime();
  };
}

export async function subscribeMentors(onChange, onError) {
  const unsubscribeInvalidation = subscribeInvalidation(
    mentorInvalidationSubscribers,
    onChange
  );
  const pb = getPocketBase();
  let unsubscribeRealtime = () => {};
  try {
    const unsubscribe = await pb.collection(MENTOR_COLLECTION).subscribe('*', () => {
      onChange?.();
    });
    unsubscribeRealtime = () => {
      try {
        unsubscribe?.();
      } catch {
        // no-op
      }
    };
  } catch (error) {
    onError?.(error);
  }

  return () => {
    unsubscribeInvalidation();
    unsubscribeRealtime();
  };
}

export async function createCourse(
  course,
  { coverImageFile, lessonVideoUploads = [], onLessonUploadProgress } = {}
) {
  const pb = getPocketBase();
  const payload = sanitizeCoursePayload(course);
  if (coverImageFile) payload.coverImage = coverImageFile;
  let created = await pb.collection(COURSE_COLLECTION).create(payload);

  if (Array.isArray(lessonVideoUploads) && lessonVideoUploads.length > 0) {
    const updatedSections = await uploadLessonVideos(pb, {
      record: created,
      sections: payload.sections,
      uploads: lessonVideoUploads,
      onProgress: onLessonUploadProgress,
    });
    created = await pb.collection(COURSE_COLLECTION).update(created.id, {
      sections: updatedSections,
    });
  }

  const mapped = mapCourse(pb, created);
  invalidateCoursesQuery();
  return mapped;
}

export async function updateCourse(
  courseId,
  course,
  { coverImageFile, previousCoverUrl = '', lessonVideoUploads = [], onLessonUploadProgress } = {}
) {
  const pb = getPocketBase();
  const payload = sanitizeCoursePayload(course);
  if (coverImageFile) payload.coverImage = coverImageFile;
  if (!coverImageFile && !payload.coverImageUrl && `${previousCoverUrl || ''}`.trim()) {
    payload.coverImage = null;
  }
  let updated = await pb.collection(COURSE_COLLECTION).update(courseId, payload);

  if (Array.isArray(lessonVideoUploads) && lessonVideoUploads.length > 0) {
    const updatedSections = await uploadLessonVideos(pb, {
      record: updated,
      sections: payload.sections,
      uploads: lessonVideoUploads,
      onProgress: onLessonUploadProgress,
    });
    updated = await pb.collection(COURSE_COLLECTION).update(courseId, {
      sections: updatedSections,
    });
  }

  const mapped = mapCourse(pb, updated);
  invalidateCoursesQuery();
  return mapped;
}

export async function deleteCourse(courseId) {
  const pb = getPocketBase();
  await pb.collection(COURSE_COLLECTION).delete(courseId);
  invalidateCoursesQuery();
}

export async function createMentor(mentor, { imageFile } = {}) {
  const pb = getPocketBase();
  const payload = sanitizeMentorPayload(mentor);
  if (imageFile) payload.image = imageFile;
  const created = await pb.collection(MENTOR_COLLECTION).create(payload);
  const mapped = mapMentor(pb, created);
  invalidateMentorsQuery();
  return mapped;
}

export async function updateMentor(mentorId, mentor, { imageFile } = {}) {
  const pb = getPocketBase();
  const payload = sanitizeMentorPayload(mentor);
  if (imageFile) payload.image = imageFile;
  const updated = await pb.collection(MENTOR_COLLECTION).update(mentorId, payload);
  const mapped = mapMentor(pb, updated);
  invalidateMentorsQuery();
  return mapped;
}

export async function deleteMentor(mentorId) {
  const pb = getPocketBase();
  await pb.collection(MENTOR_COLLECTION).delete(mentorId);
  invalidateMentorsQuery();
}

export async function saveCourseFeaturedOrder(orderedCourses = []) {
  const pb = getPocketBase();
  const tasks = orderedCourses.map((course, index) =>
    pb.collection(COURSE_COLLECTION).update(course.id, { featuredRank: index + 1 })
  );
  await Promise.all(tasks);
  invalidateCoursesQuery();
}

export async function saveMentorFeaturedOrder(orderedMentors = []) {
  const pb = getPocketBase();
  const tasks = orderedMentors.map((mentor, index) =>
    pb.collection(MENTOR_COLLECTION).update(mentor.id, { featuredRank: index + 1 })
  );
  await Promise.all(tasks);
  invalidateMentorsQuery();
}

export function isCourseSaved(courseId) {
  return readSavedCourseIds().has(`${courseId}`);
}

export function toggleCourseSaved(courseId) {
  const key = `${courseId}`;
  const savedIds = readSavedCourseIds();
  let saved = false;
  if (savedIds.has(key)) {
    savedIds.delete(key);
  } else {
    savedIds.add(key);
    saved = true;
  }
  writeSavedCourseIds(savedIds);
  return saved;
}

export function seedCourseBookmark(courseId, fallback = false) {
  const key = `${courseId}`;
  const savedIds = readSavedCourseIds();
  if (!savedIds.has(key) && fallback) {
    savedIds.add(key);
    writeSavedCourseIds(savedIds);
  }
}

export { orderFeaturedCourses, orderFeaturedMentors };
