
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast.jsx';
import {
  buildCategories,
  createCourse,
  createMentor,
  deleteCourse,
  deleteMentor,
  fetchCourses,
  fetchMentors,
  subscribeCourses,
  subscribeMentors,
  updateCourse,
  updateMentor,
} from '../services/homeData.js';
import { subscribeAdminTransactions, updateTransactionStatus } from '../services/transactions.js';
import { useAuth } from '../state/auth.jsx';

const STATUS = {
  paid: { label: 'Paid', color: '#1F7C64' },
  waiting: { label: 'Waiting', color: '#E2702B' },
  rejected: { label: 'Rejected', color: '#E74C3C' },
};

const keyOf = (v) => `${v || ''}`.trim().toLowerCase();
const fmtPrice = (v = '') => {
  const t = `${v}`.trim();
  if (!t) return '';
  return t.toLowerCase().startsWith('egp') ? t : `EGP ${t}`;
};
const fmtStudents = (v = '') => {
  const t = `${v}`.trim();
  if (!t) return '0 Std';
  return t.toLowerCase().includes('std') ? t : `${t} Std`;
};
const stripPrice = (v = '') => `${v}`.replace(/^\s*egp\s*/i, '').trim();
const stripStudents = (v = '') => `${v}`.replace(/\s*std\s*/i, '').trim();

const ytId = (v = '') => {
  const t = `${v || ''}`.trim();
  if (!t) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/i,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
};

const mkLesson = (i = 0, seed = {}) => {
  const rawVideo = `${seed.videoUrl || ''}`.trim();
  const isYt = rawVideo ? Boolean(ytId(rawVideo)) : false;
  return {
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: `${seed.title || ''}`.trim() || `Lesson ${i + 1}`,
    videoUrl: isYt ? rawVideo : '',
    existingVideoUrl: isYt ? '' : rawVideo,
    videoFile: null,
    videoFileName: '',
  };
};

const mkSection = (i = 0, seed = {}) => {
  const source = Array.isArray(seed.lessons) ? seed.lessons : [];
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: `${seed.title || ''}`.trim() || `Section ${i + 1}`,
    lessons: source.length ? source.map((item, idx) => mkLesson(idx, item)) : [mkLesson(0)],
  };
};

const fileNameFromUrl = (v = '') => {
  const t = `${v || ''}`.trim();
  if (!t) return 'No video selected';
  try {
    const p = new URL(t);
    const s = p.pathname.split('/').filter(Boolean)
    return s[s.length - 1] || t;
  } catch {
    const s = t.split('/').filter(Boolean);
    return s[s.length - 1] || t;
  }
};

export default function AdminCourses({ isMentorMode = false }) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [message, setMessage] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingMentor, setSavingMentor] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState('');
  const [busyTxId, setBusyTxId] = useState('');

  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [rating, setRating] = useState('');
  const [students, setStudents] = useState('');
  const [hours, setHours] = useState('');
  const [sections, setSections] = useState([mkSection(0)]);
  const [sectionsCount, setSectionsCount] = useState('1');

  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePath, setCoverImagePath] = useState('');
  const [initialCoverImagePath, setInitialCoverImagePath] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const [showMentorInput, setShowMentorInput] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorCategory, setMentorCategory] = useState('');
  const [mentorImageFile, setMentorImageFile] = useState(null);
  const [mentorImagePath, setMentorImagePath] = useState('');
  const [editingCourseId, setEditingCourseId] = useState('');
  const [editingMentorId, setEditingMentorId] = useState('');

  const coverPreview = useMemo(
    () => (coverImageFile ? URL.createObjectURL(coverImageFile) : ''),
    [coverImageFile]
  );
  const mentorPreview = useMemo(
    () => (mentorImageFile ? URL.createObjectURL(mentorImageFile) : ''),
    [mentorImageFile]
  );

  const baseCategories = useMemo(() => buildCategories(courses), [courses]);
  const categories = useMemo(() => {
    const map = new Map();
    for (const item of [...baseCategories, ...customCategories]) {
      const t = `${item || ''}`.trim();
      if (!t) continue;
      if (!map.has(keyOf(t))) map.set(keyOf(t), t);
    }
    if (!map.size) map.set('general', 'General');
    return Array.from(map.values());
  }, [baseCategories, customCategories]);

  const mentorNames = useMemo(() => {
    const map = new Map();
    for (const mentor of mentors) {
      const name = `${mentor?.name || ''}`.trim();
      if (!name) continue;
      if (!map.has(keyOf(name))) map.set(keyOf(name), name);
    }
    return Array.from(map.values());
  }, [mentors]);

  const visibleCourses = useMemo(() => {
    if (!isMentorMode || !profile) return courses;
    const myName = `${profile.name || ''}`.trim();
    return courses.filter((item) => {
      if (item.mentorId && user?.uid && item.mentorId === user.uid) return true;
      return myName && keyOf(item.mentorName) === keyOf(myName);
    });
  }, [courses, isMentorMode, profile, user?.uid]);

  const loadCatalog = async () => {
    const [c, m] = await Promise.all([fetchCourses(), fetchMentors()]);
    setCourses(c || []);
    setMentors(m || []);
  };

  useEffect(() => {
    let isActive = true;
    let unsubscribeCourses = () => {};
    let unsubscribeMentors = () => {};

    const load = async () => {
      try {
        const [c, m] = await Promise.all([fetchCourses(), fetchMentors()]);
        if (!isActive) return;
        setCourses(c || []);
        setMentors(m || []);
      } catch {
        if (!isActive) return;
        setCourses([]);
        setMentors([]);
      }
    };

    void load();
    subscribeCourses(() => {
      void load();
    }).then((unsubscribe) => {
      unsubscribeCourses = unsubscribe;
    }).catch(() => {});

    subscribeMentors(() => {
      void load();
    }).then((unsubscribe) => {
      unsubscribeMentors = unsubscribe;
    }).catch(() => {});

    return () => {
      isActive = false;
      unsubscribeCourses();
      unsubscribeMentors();
    };
  }, []);

  useEffect(() => {
    if (isMentorMode) return () => {};
    return subscribeAdminTransactions((items) => setTransactions(items || []), () => setTransactions([]));
  }, [isMentorMode]);

  useEffect(() => setSectionsCount(`${sections.length}`), [sections.length]);

  useEffect(() => {
    if (!selectedCategory && categories.length) setSelectedCategory(categories[0]);
    if (!mentorCategory && categories.length) setMentorCategory(categories[0]);
  }, [categories, mentorCategory, selectedCategory]);

  useEffect(() => {
    if (isMentorMode) {
      const fallback = `${profile?.name || profile?.email || ''}`.trim();
      if (fallback && !selectedMentor) setSelectedMentor(fallback);
      return;
    }
    if (!selectedMentor && mentorNames.length) setSelectedMentor(mentorNames[0]);
  }, [isMentorMode, mentorNames, profile?.name, profile?.email, selectedMentor]);

  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );

  useEffect(
    () => () => {
      if (mentorPreview) URL.revokeObjectURL(mentorPreview);
    },
    [mentorPreview]
  );

  const resolveCategory = () => `${selectedCategory || ''}`.trim() || categories[0] || 'General';

  const resetCourseForm = () => {
    setTitle('');
    setPrice('');
    setOldPrice('');
    setRating('');
    setStudents('');
    setHours('');
    setCoverImageFile(null);
    setCoverImagePath('');
    setInitialCoverImagePath('');
    setEditingCourseId('');
    setSections([mkSection(0)]);
    setShowCategoryInput(false);
    setNewCategory('');
  };

  const resetMentorForm = () => {
    setShowMentorInput(false);
    setMentorName('');
    setMentorCategory(categories[0] || 'General');
    setMentorImageFile(null);
    setMentorImagePath('');
    setEditingMentorId('');
  };

  const saveNewCategory = () => {
    const t = `${newCategory || ''}`.trim();
    if (!t) return setMessage('Enter a category name.');
    if (categories.some((item) => keyOf(item) === keyOf(t))) return setMessage('Category already exists.');
    setCustomCategories((prev) => [...prev, t]);
    setSelectedCategory(t);
    setMentorCategory(t);
    setShowCategoryInput(false);
    setNewCategory('');
  };
  const setSectionsByCount = (count) => {
    const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    setSections((prev) => {
      if (safe === prev.length) return prev;
      if (safe > prev.length) {
        const next = prev.slice();
        for (let i = prev.length; i < safe; i += 1) next.push(mkSection(i));
        return next;
      }
      return prev.slice(0, safe);
    });
  };

  const onSectionsCountChange = (value) => {
    const digits = `${value || ''}`.replace(/\D/g, '');
    setSectionsCount(digits);
    const parsed = Number.parseInt(digits || '0', 10);
    setSectionsByCount(Number.isFinite(parsed) ? parsed : 0);
  };

  const addSection = () => setSections((prev) => [...prev, mkSection(prev.length)]);
  const removeSection = (id) => setSections((prev) => prev.filter((s) => s.id !== id));
  const updateSectionTitle = (id, value) => setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: value } : s)));
  const addLesson = (sectionId) => setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, lessons: [...s.lessons, mkLesson(s.lessons.length)] } : s)));
  const removeLesson = (sectionId, lessonId) => setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) } : s)));
  const updateLessonField = (sectionId, lessonId, key, value) => setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, [key]: value } : l)) } : s)));

  const setLessonVideoFile = (sectionId, lessonId, file) => {
    if (!file) return;
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, videoFile: file, videoFileName: file.name || '', existingVideoUrl: '', videoUrl: '' } : l)),
      };
    }));
  };

  const clearLessonVideo = (sectionId, lessonId) => setSections((prev) => prev.map((s) => {
    if (s.id !== sectionId) return s;
    return { ...s, lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, videoFile: null, videoFileName: '', existingVideoUrl: '' } : l)) };
  }));

  const buildSectionsForSave = () => {
    if (!sections.length) return setMessage('Add at least one section.'), null;
    const outSections = [];
    const lessonVideoUploads = [];
    let totalLessons = 0;

    for (let sIdx = 0; sIdx < sections.length; sIdx += 1) {
      const section = sections[sIdx];
      const sectionTitle = `${section.title || ''}`.trim();
      if (!sectionTitle) return setMessage('Enter a name for each section.'), null;
      if (!Array.isArray(section.lessons) || section.lessons.length === 0) return setMessage('Each section needs at least one lesson.'), null;

      const lessons = [];
      for (let lIdx = 0; lIdx < section.lessons.length; lIdx += 1) {
        const lesson = section.lessons[lIdx];
        const lessonTitle = `${lesson.title || ''}`.trim();
        if (!lessonTitle) return setMessage('Enter a name for each lesson.'), null;
        const rawVideo = `${lesson.videoUrl || ''}`.trim();
        const existingVideo = `${lesson.existingVideoUrl || ''}`.trim();
        const hasLocal = Boolean(lesson.videoFile);
        if (!hasLocal && rawVideo && !ytId(rawVideo)) return setMessage(`Enter a valid YouTube link for "${lessonTitle}".`), null;
        const resolvedVideo = hasLocal ? existingVideo : rawVideo || existingVideo;
        lessons.push({ title: lessonTitle, videoUrl: resolvedVideo });
        if (hasLocal) lessonVideoUploads.push({ sectionIndex: sIdx, lessonIndex: lIdx, file: lesson.videoFile });
      }
      totalLessons += lessons.length;
      outSections.push({ title: sectionTitle, lessons });
    }

    if (totalLessons === 0) return setMessage('Add at least one lesson.'), null;
    return { sections: outSections, lessonVideoUploads };
  };

  const resolveMentor = () => {
    const selected = `${selectedMentor || ''}`.trim();
    if (isMentorMode) {
      const name = selected || `${profile?.name || profile?.email || ''}`.trim();
      if (!name) return null;
      const existing = mentors.find((m) => keyOf(m.name) === keyOf(name));
      if (existing) return existing;
      const category = `${mentorCategory || resolveCategory() || 'General'}`.trim() || 'General';
      return { id: '', name, category, subtitle: `${category} Mentor`, imagePath: '' };
    }
    if (!mentors.length) return null;
    if (!selected) return mentors[0];
    return mentors.find((m) => keyOf(m.name) === keyOf(selected)) || mentors[0];
  };

  const ensureMentorRecord = async (mentor) => {
    if (!mentor) return null;
    if (!isMentorMode || mentor.id) return mentor;
    try {
      return await createMentor({ name: mentor.name, category: mentor.category || resolveCategory(), subtitle: mentor.subtitle || `${mentor.category || 'General'} Mentor`, courses: '0', students: '0', ratings: '0' });
    } catch {
      return null;
    }
  };

  const saveMentor = async () => {
    if (savingMentor) return;
    const name = `${mentorName || ''}`.trim();
    if (!name) return setMessage('Enter a mentor name.');
    const duplicate = mentors.find((m) => (editingMentorId ? m.id !== editingMentorId : true) && keyOf(m.name) === keyOf(name));
    if (duplicate) return setMessage('Mentor already exists.');

    const category = `${mentorCategory || resolveCategory() || 'General'}`.trim() || 'General';
    const payload = { name, category, subtitle: `${category} Mentor`, imagePath: mentorImagePath, courses: '0', students: '0', ratings: '0' };

    setSavingMentor(true);
    try {
      if (editingMentorId) {
        const saved = await updateMentor(editingMentorId, payload, { imageFile: mentorImageFile || undefined });
        setSelectedMentor(saved.name || name);
        setMessage('Mentor updated.');
      } else {
        const created = await createMentor(payload, { imageFile: mentorImageFile || undefined });
        setSelectedMentor(created?.name || name);
        setMessage('Mentor added.');
      }
      await loadCatalog();
      resetMentorForm();
    } catch (error) {
      setMessage(error?.message || 'Could not save mentor.');
    } finally {
      setSavingMentor(false);
    }
  };

  const saveCourse = async () => {
    if (savingCourse) return;
    const resolvedTitle = `${title || ''}`.trim();
    const category = resolveCategory();
    const priceLabel = fmtPrice(price);
    const oldPriceLabel = fmtPrice(oldPrice);
    const resolvedRating = `${rating || ''}`.trim();
    const studentsLabel = fmtStudents(students);
    const hoursValue = Number.parseInt(`${hours || ''}`.trim(), 10) || 0;
    const mentor = resolveMentor();

    if (!resolvedTitle || !category || !priceLabel || !resolvedRating || hoursValue <= 0) return setMessage('Fill all required fields.');
    if (!mentor) return setMessage('Select a mentor.');

    const resolvedMentor = await ensureMentorRecord(mentor);
    if (!resolvedMentor) return setMessage('Select a mentor.');

    const sectionResult = buildSectionsForSave();
    if (!sectionResult) return;

    const duplicate = courses.find((c) => (editingCourseId ? c.id !== editingCourseId : true) && keyOf(c.title) === keyOf(resolvedTitle));
    if (duplicate) return setMessage('Course title already exists.');

    const payload = {
      category,
      title: resolvedTitle,
      mentorId: resolvedMentor.id || (isMentorMode ? user?.uid || '' : ''),
      mentorName: resolvedMentor.name || selectedMentor,
      mentorSubtitle: resolvedMentor.subtitle || `${category} Mentor`,
      mentorImagePath: resolvedMentor.imagePath || '',
      coverImagePath,
      price: priceLabel,
      oldPrice: oldPriceLabel || priceLabel,
      rating: resolvedRating,
      students: studentsLabel,
      classes: sectionResult.sections.length,
      hours: hoursValue,
      bookmarked: false,
      sections: sectionResult.sections,
    };

    setSavingCourse(true);
    try {
      if (editingCourseId) {
        await updateCourse(editingCourseId, payload, { coverImageFile: coverImageFile || undefined, previousCoverUrl: initialCoverImagePath || '', lessonVideoUploads: sectionResult.lessonVideoUploads });
        setMessage('Course updated.');
      } else {
        await createCourse(payload, { coverImageFile: coverImageFile || undefined, lessonVideoUploads: sectionResult.lessonVideoUploads });
        setMessage('Course added.');
      }
      await loadCatalog();
      resetCourseForm();
    } catch (error) {
      setMessage(error?.message || 'Could not save course.');
    } finally {
      setSavingCourse(false);
    }
  };
  const startEditMentor = (mentor) => {
    setEditingMentorId(mentor.id || '');
    setShowMentorInput(true);
    setMentorName(mentor.name || '');
    setMentorCategory(mentor.category || resolveCategory());
    setMentorImagePath(mentor.imagePath || '');
    setMentorImageFile(null);
  };

  const removeMentor = async (mentor) => {
    const id = `${mentor?.id || ''}`.trim();
    if (!id || busyDeleteId) return;
    setBusyDeleteId(id);
    try {
      await deleteMentor(id);
      await loadCatalog();
      setMessage('Mentor deleted.');
    } catch (error) {
      setMessage(error?.message || 'Could not delete mentor.');
    } finally {
      setBusyDeleteId('');
    }
  };

  const startEditCourse = (course) => {
    setEditingCourseId(course.id || '');
    setTitle(course.title || '');
    setPrice(stripPrice(course.price || ''));
    setOldPrice(stripPrice(course.oldPrice || ''));
    setRating(course.rating || '');
    setStudents(stripStudents(course.students || ''));
    setHours(course.hours ? `${course.hours}` : '');
    setSelectedCategory(course.category || resolveCategory());
    setSelectedMentor(course.mentorName || selectedMentor);
    setCoverImageFile(null);
    setCoverImagePath(course.coverImagePath || '');
    setInitialCoverImagePath(course.coverImagePath || '');
    setShowCategoryInput(false);
    setNewCategory('');
    const source = Array.isArray(course.sections) ? course.sections : [];
    setSections(source.length ? source.map((s, i) => mkSection(i, s)) : [mkSection(0)]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeCourse = async (course) => {
    const id = `${course?.id || ''}`.trim();
    if (!id || busyDeleteId) return;
    setBusyDeleteId(id);
    try {
      await deleteCourse(id);
      await loadCatalog();
      setMessage('Course deleted.');
    } catch (error) {
      setMessage(error?.message || 'Could not delete course.');
    } finally {
      setBusyDeleteId('');
    }
  };

  const updateStatus = async (item, status) => {
    const id = `${item?.id || ''}`.trim();
    if (!id || busyTxId) return;
    setBusyTxId(id);
    try {
      await updateTransactionStatus(id, status);
      setMessage(status === 'paid' ? 'Payment approved.' : 'Payment rejected.');
    } catch (error) {
      setMessage(error?.message || 'Could not update payment.');
    } finally {
      setBusyTxId('');
    }
  };
  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>{isMentorMode ? 'Mentor Courses' : 'Admin Courses'}</h2>
        </div>

        <div className="admin-section">
          <h3>{editingCourseId ? 'Edit Course' : 'Create Course'}</h3>
          <div className="admin-form">
            <div className="admin-field">
              <label>Course Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mobile UI Design" />
            </div>

            <div className="admin-field">
              <label>Course Cover</label>
              <div className="admin-upload-row">
                <div className="admin-upload-preview">
                  {coverImageFile || coverImagePath ? <img src={coverImageFile ? coverPreview : coverImagePath} alt="Course cover preview" /> : <span className="material-icons-outlined" aria-hidden>image</span>}
                </div>
                <div className="admin-upload-actions">
                  <label className="secondary-button admin-file-label">
                    {coverImageFile || coverImagePath ? 'Change Image' : 'Choose Image'}
                    <input type="file" accept="image/*" hidden disabled={savingCourse} onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} />
                  </label>
                  {coverImageFile || coverImagePath ? <button type="button" className="secondary-button" onClick={() => { setCoverImageFile(null); setCoverImagePath(''); }} disabled={savingCourse}>Clear</button> : null}
                </div>
              </div>
            </div>

            <div className="admin-field">
              <label>Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button type="button" className="link-button" onClick={() => { setShowCategoryInput((p) => !p); if (showCategoryInput) setNewCategory(''); }}>
                {showCategoryInput ? 'Cancel' : 'Add Category'}
              </button>
              {showCategoryInput ? (
                <div className="admin-inline-actions">
                  <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Data Science" />
                  <button type="button" className="secondary-button" onClick={saveNewCategory}>Add</button>
                </div>
              ) : null}
            </div>

            {isMentorMode ? (
              <div className="admin-field">
                <label>Mentor</label>
                <input value={selectedMentor} disabled />
              </div>
            ) : (
              <div className="admin-field">
                <label>Mentor</label>
                <select value={selectedMentor} onChange={(e) => setSelectedMentor(e.target.value)}>
                  {mentorNames.length ? mentorNames.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">No mentors</option>}
                </select>
                <button type="button" className="link-button" onClick={() => {
                  if (showMentorInput && !editingMentorId) return resetMentorForm();
                  setShowMentorInput(true); setEditingMentorId(''); setMentorName(''); setMentorCategory(resolveCategory()); setMentorImageFile(null); setMentorImagePath('');
                }}>
                  {showMentorInput ? (editingMentorId ? 'Cancel Edit' : 'Cancel') : 'Add Mentor'}
                </button>
              </div>
            )}

            {showMentorInput && !isMentorMode ? (
              <div className="admin-subcard">
                <div className="admin-field">
                  <label>Mentor Name</label>
                  <input value={mentorName} onChange={(e) => setMentorName(e.target.value)} placeholder="Mentor name" />
                </div>
                <div className="admin-field">
                  <label>Mentor Category</label>
                  <select value={mentorCategory} onChange={(e) => setMentorCategory(e.target.value)}>
                    {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label>Profile Image</label>
                  <div className="admin-upload-row">
                    <div className="admin-upload-preview round">
                      {mentorImageFile || mentorImagePath ? <img src={mentorImageFile ? mentorPreview : mentorImagePath} alt="Mentor preview" /> : <span className="material-icons-round" aria-hidden>person</span>}
                    </div>
                    <div className="admin-upload-actions">
                      <label className="secondary-button admin-file-label">
                        {mentorImageFile || mentorImagePath ? 'Change Image' : 'Choose Image'}
                        <input type="file" accept="image/*" hidden disabled={savingMentor} onChange={(e) => setMentorImageFile(e.target.files?.[0] || null)} />
                      </label>
                      {mentorImageFile || mentorImagePath ? <button type="button" className="secondary-button" onClick={() => { setMentorImageFile(null); setMentorImagePath(''); }} disabled={savingMentor}>Clear</button> : null}
                    </div>
                  </div>
                </div>
                <div className="admin-actions">
                  <button type="button" className="secondary-button" onClick={resetMentorForm} disabled={savingMentor}>Cancel</button>
                  <button type="button" className="primary-pill" onClick={saveMentor} disabled={savingMentor}><span>{savingMentor ? 'Saving...' : editingMentorId ? 'Save' : 'Add'}</span><span className="primary-pill__arrow">&gt;</span></button>
                </div>
              </div>
            ) : null}

            <div className="admin-row">
              <div className="admin-field"><label>Price (EGP)</label><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1450" /></div>
              <div className="admin-field"><label>Old Price</label><input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="1890" /></div>
            </div>
            <div className="admin-row">
              <div className="admin-field"><label>Rating</label><input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" /></div>
              <div className="admin-field"><label>Students</label><input value={students} onChange={(e) => setStudents(e.target.value)} placeholder="7800" /></div>
            </div>
            <div className="admin-field"><label>Sections</label><input value={sectionsCount} onChange={(e) => onSectionsCountChange(e.target.value)} placeholder="e.g. 3" inputMode="numeric" /></div>

            <div className="admin-sections">
              {!sections.length ? <div className="admin-empty-note">No sections yet.</div> : sections.map((section, sIdx) => (
                <div key={section.id} className="admin-section-card">
                  <div className="admin-section-card__head">
                    <strong>Section {sIdx + 1}</strong>
                    <button type="button" className="danger-text-button" onClick={() => removeSection(section.id)}>Remove</button>
                  </div>
                  <div className="admin-field"><label>Section Name</label><input value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} placeholder={`Section ${sIdx + 1}`} /></div>
                  <div className="admin-field">
                    <label>Lessons</label>
                    <div className="admin-lesson-list">
                      {section.lessons.map((lesson, lIdx) => {
                        const hasVideo = Boolean(lesson.videoFile) || Boolean(lesson.existingVideoUrl);
                        return (
                          <div key={lesson.id} className="admin-lesson-row">
                            <div className="admin-row">
                              <div className="admin-field"><input value={lesson.title} onChange={(e) => updateLessonField(section.id, lesson.id, 'title', e.target.value)} placeholder={`Lesson ${lIdx + 1}`} /></div>
                              <div className="admin-field">
                                <div className="admin-inline-actions admin-inline-actions--tight">
                                  <input value={lesson.videoUrl} onChange={(e) => updateLessonField(section.id, lesson.id, 'videoUrl', e.target.value)} placeholder="YouTube link (optional)" disabled={hasVideo} />
                                  <button type="button" className="danger-text-button" onClick={() => removeLesson(section.id, lesson.id)}>Remove</button>
                                </div>
                              </div>
                            </div>
                            <div className="admin-upload-actions">
                              <label className="secondary-button admin-file-label">
                                {hasVideo ? 'Change Video' : 'Upload Video'}
                                <input type="file" accept="video/*" hidden disabled={savingCourse} onChange={(e) => setLessonVideoFile(section.id, lesson.id, e.target.files?.[0])} />
                              </label>
                              {hasVideo ? <button type="button" className="secondary-button" onClick={() => clearLessonVideo(section.id, lesson.id)} disabled={savingCourse}>Clear</button> : null}
                              {hasVideo ? <span className="admin-upload-filename">{lesson.videoFile ? lesson.videoFileName || lesson.videoFile.name : fileNameFromUrl(lesson.existingVideoUrl)}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button type="button" className="link-button" onClick={() => addLesson(section.id)}>Add Lesson</button>
                </div>
              ))}
              <button type="button" className="link-button" onClick={addSection}>Add Section</button>
            </div>

            <div className="admin-field"><label>Hours</label><input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="42" /></div>
            <div className="admin-actions">
              {editingCourseId ? <button type="button" className="secondary-button" onClick={resetCourseForm} disabled={savingCourse}>Cancel</button> : null}
              <button type="button" className="primary-pill" onClick={saveCourse} disabled={savingCourse}><span>{savingCourse ? 'Saving...' : editingCourseId ? 'Update' : 'Add Course'}</span><span className="primary-pill__arrow">&gt;</span></button>
            </div>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h3>All Courses ({visibleCourses.length})</h3>
            <button type="button" className="link-button" onClick={() => navigate('/popular-courses')}>Preview</button>
          </div>
          <div className="admin-list">
            {visibleCourses.map((course) => (
              <div key={course.id || course.title} className="admin-card">
                <div className="admin-card__media">{course.coverImagePath ? <img src={course.coverImagePath} alt={course.title} /> : null}</div>
                <div className="admin-card__body"><strong>{course.title}</strong><span>{course.category}</span><span>{course.price} | {course.rating} | {course.students}</span></div>
                <div className="admin-card__actions">
                  <button type="button" onClick={() => startEditCourse(course)}>Edit</button>
                  <button type="button" className="danger" disabled={busyDeleteId === course.id} onClick={() => removeCourse(course)}>{busyDeleteId === course.id ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {!isMentorMode ? (
          <div className="admin-section">
            <h3>All Mentors ({mentors.length})</h3>
            <div className="admin-list">
              {mentors.map((mentor) => (
                <div key={mentor.id || mentor.name} className="admin-card">
                  <div className="admin-card__media round">{mentor.imagePath ? <img src={mentor.imagePath} alt={mentor.name} /> : null}</div>
                  <div className="admin-card__body"><strong>{mentor.name}</strong><span>{mentor.category}</span><span>{mentor.subtitle}</span></div>
                  <div className="admin-card__actions">
                    <button type="button" onClick={() => startEditMentor(mentor)}>Edit</button>
                    <button type="button" className="danger" disabled={busyDeleteId === mentor.id} onClick={() => removeMentor(mentor)}>{busyDeleteId === mentor.id ? 'Deleting...' : 'Delete'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isMentorMode ? (
          <div className="admin-section">
            <h3>Payment Requests ({transactions.length})</h3>
            <div className="admin-list">
              {transactions.map((item) => {
                const status = STATUS[item.status] || STATUS.waiting;
                const isBusy = busyTxId === item.id;
                return (
                  <div key={item.id} className="admin-card">
                    <div className="admin-card__body"><strong>{item.courseTitle}</strong><span>{item.userName || item.userEmail}</span><span>{item.priceLabel}</span></div>
                    <div className="admin-card__status" style={{ color: status.color }}>{status.label}</div>
                    <div className="admin-card__actions">
                      {item.status === 'waiting' ? (
                        <>
                          <button type="button" disabled={isBusy} onClick={() => updateStatus(item, 'paid')}>{isBusy ? 'Updating...' : 'Approve'}</button>
                          <button type="button" className="danger" disabled={isBusy} onClick={() => updateStatus(item, 'rejected')}>{isBusy ? 'Updating...' : 'Reject'}</button>
                        </>
                      ) : (
                        <button type="button" className="danger" disabled={isBusy} onClick={() => updateStatus(item, 'rejected')}>{isBusy ? 'Updating...' : 'Remove Access'}</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
