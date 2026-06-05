import mongoose from 'mongoose';

const lessonProgressSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchedSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const courseProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    completedLessons: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalLessons: {
      type: Number,
      min: 0,
      default: 0,
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    lastLessonId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lessonProgress: {
      type: [lessonProgressSchema],
      default: [],
    },
    completedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

courseProgressSchema.index(
  { studentId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
courseProgressSchema.index({ courseId: 1, progressPercent: -1 });
courseProgressSchema.index({ studentId: 1, updatedAt: -1 });

courseProgressSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);
