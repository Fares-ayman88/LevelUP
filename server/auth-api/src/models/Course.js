import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const thumbnailSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, maxlength: 1000 },
    key: { type: String, trim: true, maxlength: 500 },
    alt: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const pricingSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'USD', minlength: 3, maxlength: 3 },
    isFree: { type: Boolean, default: true },
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 220,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 8000,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseCategory',
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
      index: true,
    },
    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'en',
      maxlength: 12,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 20,
        message: 'A course can have at most 20 tags',
      },
    },
    thumbnail: {
      type: thumbnailSchema,
      default: {},
    },
    pricing: {
      type: pricingSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    totalLessons: { type: Number, min: 0, default: 0 },
    totalDurationSeconds: { type: Number, min: 0, default: 0 },
    enrollmentCount: { type: Number, min: 0, default: 0, index: true },
    averageRating: { type: Number, min: 0, max: 5, default: 0, index: true },
    reviewCount: { type: Number, min: 0, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

courseSchema.index({ title: 'text', subtitle: 'text', description: 'text', tags: 'text' });
courseSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });
courseSchema.index({ categoryId: 1, status: 1, deletedAt: 1, createdAt: -1 });
courseSchema.index({ instructorId: 1, deletedAt: 1, createdAt: -1 });
courseSchema.index({ status: 1, averageRating: -1, enrollmentCount: -1 });

courseSchema.pre('validate', function setSlug(next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
  this.tags = [...new Set((this.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  next();
});

courseSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Course = mongoose.model('Course', courseSchema);
