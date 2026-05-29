import mongoose from 'mongoose';

const cloudinarySchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, index: true },
    assetId: { type: String },
    version: { type: Number },
    resourceType: { type: String, default: 'video' },
    type: { type: String, default: 'authenticated' },
    format: { type: String },
    bytes: { type: Number, min: 0 },
    duration: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    playbackUrl: { type: String },
    secureUrl: { type: String },
  },
  { _id: false },
);

const videoAssetSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
      default: 'uploading',
      index: true,
    },
    originalFilename: { type: String, trim: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, min: 0, required: true },
    cloudinary: { type: cloudinarySchema },
    thumbnail: {
      url: { type: String },
      signedUrl: { type: String },
      generatedAt: { type: Date },
    },
    uploadAttempts: { type: Number, min: 0, default: 0 },
    lastError: { type: String },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

videoAssetSchema.index({ courseId: 1, lessonId: 1, deletedAt: 1 });
videoAssetSchema.index({ instructorId: 1, createdAt: -1 });
videoAssetSchema.index({ status: 1, createdAt: -1 });

videoAssetSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.cloudinary?.secureUrl;
    return ret;
  },
});

export const VideoAsset = mongoose.model('VideoAsset', videoAssetSchema);
