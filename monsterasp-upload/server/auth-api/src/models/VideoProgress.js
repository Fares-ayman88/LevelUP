import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema(
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
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoAsset',
      required: true,
      index: true,
    },
    watchedSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    durationSeconds: {
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
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: { type: Date },
    lastWatchedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

videoProgressSchema.index(
  { studentId: 1, videoId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
videoProgressSchema.index({ studentId: 1, courseId: 1, updatedAt: -1 });

videoProgressSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const VideoProgress = mongoose.model('VideoProgress', videoProgressSchema);
