import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { CourseCategory } from '../models/CourseCategory.js';
import { Enrollment } from '../models/Enrollment.js';
import { CourseProgress } from '../models/CourseProgress.js';

export class CourseRepository {
  async createCourse(data) {
    return Course.create(data);
  }

  findCourseById(id, options = {}) {
    const filter = { _id: id };
    if (!options.includeDeleted) filter.deletedAt = null;
    return Course.findOne(filter);
  }

  findCourseBySlug(slug) {
    return Course.findOne({ slug, deletedAt: null });
  }

  async listCourses({ filter, sort, skip, limit }) {
    const [items, total] = await Promise.all([
      Course.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug')
        .populate('instructorId', 'name email role')
        .lean({ virtuals: true }),
      Course.countDocuments(filter),
    ]);

    return { items, total };
  }

  saveCourse(course) {
    return course.save();
  }

  async softDeleteCourse(course) {
    course.deletedAt = new Date();
    course.status = 'archived';
    return course.save();
  }

  async categoryExists(categoryId) {
    return CourseCategory.exists({ _id: categoryId, deletedAt: null, isActive: true });
  }

  async createCategory(data) {
    return CourseCategory.create(data);
  }

  async listCategories() {
    return CourseCategory.find({ deletedAt: null, isActive: true }).sort({ name: 1 }).lean({ virtuals: true });
  }

  async enrollStudent({ studentId, courseId }) {
    const session = await mongoose.startSession();
    try {
      let enrollment;
      await session.withTransaction(async () => {
        const existing = await Enrollment.findOne({ studentId, courseId, deletedAt: null }).session(session);
        if (existing) {
          enrollment = existing;
          return;
        }

        enrollment = await Enrollment.create([{ studentId, courseId }], { session }).then((docs) => docs[0]);
        const course = await Course.findById(courseId).session(session);
        await CourseProgress.create(
          [
            {
              studentId,
              courseId,
              totalLessons: course?.totalLessons || 0,
            },
          ],
          { session },
        );
        await Course.updateOne({ _id: courseId }, { $inc: { enrollmentCount: 1 } }).session(session);
      });
      return enrollment;
    } finally {
      await session.endSession();
    }
  }

  findEnrollment(studentId, courseId) {
    return Enrollment.findOne({ studentId, courseId, deletedAt: null });
  }

  async listEnrollments({ filter, skip, limit }) {
    const [items, total] = await Promise.all([
      Enrollment.find(filter)
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('courseId', 'title slug thumbnail status totalLessons averageRating')
        .populate('studentId', 'name email')
        .lean({ virtuals: true }),
      Enrollment.countDocuments(filter),
    ]);

    return { items, total };
  }

  findProgress(studentId, courseId) {
    return CourseProgress.findOne({ studentId, courseId, deletedAt: null });
  }

  saveProgress(progress) {
    return progress.save();
  }
}
