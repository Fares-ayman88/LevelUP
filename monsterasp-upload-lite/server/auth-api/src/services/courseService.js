import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { ROLES } from '../constants/roles.js';
import { CourseRepository } from '../repositories/courseRepository.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { slugify } from '../utils/slugify.js';

const courseRepository = new CourseRepository();

const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 400, 'INVALID_OBJECT_ID');
  }
};

const canManageCourse = (user, course) => {
  return user.role === ROLES.ADMIN || String(course.instructorId) === user.sub;
};

const buildCourseFilter = (query, user) => {
  const filter = { deletedAt: null };

  if (query.mine === 'true') {
    filter.instructorId = user.sub;
  }

  if (query.instructorId) {
    assertObjectId(query.instructorId, 'instructorId');
    filter.instructorId = query.instructorId;
  }

  if (query.categoryId) {
    assertObjectId(query.categoryId, 'categoryId');
    filter.categoryId = query.categoryId;
  }

  if (query.status) {
    filter.status = query.status;
  } else if (!user || user.role === ROLES.STUDENT) {
    filter.status = 'published';
  }

  if (query.level) filter.level = query.level;
  if (query.language) filter.language = query.language.toLowerCase();

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  return filter;
};

const buildCourseSort = (query) => {
  if (query.q) return { score: { $meta: 'textScore' }, enrollmentCount: -1 };
  if (query.sort === 'popular') return { enrollmentCount: -1, averageRating: -1 };
  if (query.sort === 'rating') return { averageRating: -1, reviewCount: -1 };
  if (query.sort === 'oldest') return { createdAt: 1 };
  return { createdAt: -1 };
};

export class CourseService {
  async createCourse(payload, user) {
    if (![ROLES.INSTRUCTOR, ROLES.ADMIN].includes(user.role)) {
      throw new AppError('Only instructors and admins can create courses', 403, 'FORBIDDEN');
    }

    assertObjectId(payload.categoryId, 'categoryId');
    const categoryExists = await courseRepository.categoryExists(payload.categoryId);
    if (!categoryExists) {
      throw new AppError('Category was not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const baseSlug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    return courseRepository.createCourse({
      ...payload,
      slug,
      instructorId: user.role === ROLES.ADMIN && payload.instructorId ? payload.instructorId : user.sub,
      status: 'draft',
      publishedAt: undefined,
    });
  }

  async updateCourse(courseId, payload, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot manage this course', 403, 'FORBIDDEN');

    if (payload.categoryId) {
      assertObjectId(payload.categoryId, 'categoryId');
      const categoryExists = await courseRepository.categoryExists(payload.categoryId);
      if (!categoryExists) throw new AppError('Category was not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const allowedFields = [
      'title',
      'subtitle',
      'description',
      'categoryId',
      'level',
      'language',
      'tags',
      'thumbnail',
      'pricing',
      'totalLessons',
      'totalDurationSeconds',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        course[field] = payload[field];
      }
    }

    return courseRepository.saveCourse(course);
  }

  async deleteCourse(courseId, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot manage this course', 403, 'FORBIDDEN');

    return courseRepository.softDeleteCourse(course);
  }

  async publishCourse(courseId, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot manage this course', 403, 'FORBIDDEN');

    if (!course.title || !course.description || !course.categoryId) {
      throw new AppError('Course is missing required publishing fields', 422, 'COURSE_NOT_PUBLISHABLE');
    }

    course.status = 'published';
    course.publishedAt = course.publishedAt || new Date();
    return courseRepository.saveCourse(course);
  }

  async unpublishCourse(courseId, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot manage this course', 403, 'FORBIDDEN');

    course.status = 'draft';
    return courseRepository.saveCourse(course);
  }

  async getCourse(courseIdOrSlug, user) {
    const course = mongoose.isValidObjectId(courseIdOrSlug)
      ? await courseRepository.findCourseById(courseIdOrSlug)
      : await courseRepository.findCourseBySlug(courseIdOrSlug);

    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (course.status !== 'published' && (!user || !canManageCourse(user, course))) {
      throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    }

    return course.populate([
      { path: 'categoryId', select: 'name slug' },
      { path: 'instructorId', select: 'name email role' },
    ]);
  }

  async listCourses(query, user) {
    const { page, limit, skip } = getPagination(query);
    const filter = buildCourseFilter(query, user);
    const sort = buildCourseSort(query);
    const { items, total } = await courseRepository.listCourses({ filter, sort, skip, limit });

    return {
      items,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async createCategory(payload, user) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError('Only admins can create categories', 403, 'FORBIDDEN');
    }

    return courseRepository.createCategory({
      ...payload,
      slug: payload.slug ? slugify(payload.slug) : slugify(payload.name),
    });
  }

  async listCategories() {
    return courseRepository.listCategories();
  }

  async enroll(courseId, user) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can enroll in courses', 403, 'FORBIDDEN');
    }

    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course || course.status !== 'published') {
      throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    }

    return courseRepository.enrollStudent({ studentId: user.sub, courseId });
  }

  async listEnrollments(query, user) {
    const { page, limit, skip } = getPagination(query);
    const filter = { deletedAt: null };

    if (user.role === ROLES.STUDENT) {
      filter.studentId = user.sub;
    } else if (query.courseId) {
      assertObjectId(query.courseId, 'courseId');
      filter.courseId = query.courseId;
    } else if (user.role === ROLES.INSTRUCTOR) {
      const courses = await courseRepository.listCourses({
        filter: { instructorId: user.sub, deletedAt: null },
        sort: { createdAt: -1 },
        skip: 0,
        limit: 500,
      });
      filter.courseId = { $in: courses.items.map((course) => course._id || course.id) };
    }

    if (query.status) filter.status = query.status;

    const { items, total } = await courseRepository.listEnrollments({ filter, skip, limit });
    return {
      items,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  async updateProgress(courseId, payload, user) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can update progress', 403, 'FORBIDDEN');
    }

    assertObjectId(courseId, 'courseId');
    assertObjectId(payload.lessonId, 'lessonId');

    const enrollment = await courseRepository.findEnrollment(user.sub, courseId);
    if (!enrollment || enrollment.status !== 'active') {
      throw new AppError('You must enroll before tracking progress', 403, 'NOT_ENROLLED');
    }

    const course = await courseRepository.findCourseById(courseId);
    const progress = await courseRepository.findProgress(user.sub, courseId);
    if (!progress) throw new AppError('Progress record was not found', 404, 'PROGRESS_NOT_FOUND');

    const lessonId = String(payload.lessonId);
    let lesson = progress.lessonProgress.find((item) => String(item.lessonId) === lessonId);
    if (!lesson) {
      lesson = { lessonId: payload.lessonId };
      progress.lessonProgress.push(lesson);
    }

    lesson.watchedSeconds = Math.max(Number(payload.watchedSeconds ?? lesson.watchedSeconds ?? 0), 0);
    if (payload.completed !== undefined) {
      lesson.completed = Boolean(payload.completed);
      lesson.completedAt = lesson.completed ? lesson.completedAt || new Date() : undefined;
    }
    lesson.updatedAt = new Date();

    const completedLessons = progress.lessonProgress.filter((item) => item.completed).length;
    progress.completedLessons = completedLessons;
    progress.totalLessons = Math.max(course?.totalLessons || progress.totalLessons || completedLessons, completedLessons);
    progress.progressPercent = progress.totalLessons > 0 ? Math.min(Math.round((completedLessons / progress.totalLessons) * 100), 100) : 0;
    progress.lastLessonId = payload.lessonId;
    progress.completedAt = progress.progressPercent === 100 ? progress.completedAt || new Date() : undefined;

    if (progress.progressPercent === 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = enrollment.completedAt || new Date();
      await enrollment.save();
    }

    return courseRepository.saveProgress(progress);
  }

  async getProgress(courseId, user) {
    assertObjectId(courseId, 'courseId');
    const progress = await courseRepository.findProgress(user.sub, courseId);
    if (!progress) throw new AppError('Progress record was not found', 404, 'PROGRESS_NOT_FOUND');
    return progress;
  }
}
