import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: { type: Date },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

enrollmentSchema.index(
  { studentId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
enrollmentSchema.index({ courseId: 1, status: 1, enrolledAt: -1 });
enrollmentSchema.index({ studentId: 1, status: 1, enrolledAt: -1 });

enrollmentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
