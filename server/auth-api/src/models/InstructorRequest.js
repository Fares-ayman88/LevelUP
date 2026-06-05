import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const instructorRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 200,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 180,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
      validate: {
        validator(v) {
          return /^[+]?[\d\s\-()]+$/.test(v);
        },
        message: 'Phone number is invalid',
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    coursesTaken: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    cvUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
      validate: {
        validator(v) {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'CV URL is invalid',
      },
    },
    idUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
      validate: {
        validator(v) {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'ID URL is invalid',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

// Indexes for efficient querying
instructorRequestSchema.index({ userId: 1, deletedAt: 1 });
instructorRequestSchema.index({ email: 1, deletedAt: 1 });
instructorRequestSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });
instructorRequestSchema.index({ category: 1, status: 1 });
instructorRequestSchema.index({ createdAt: -1, deletedAt: 1 });

instructorRequestSchema.virtual('id').get(function getId() {
  return this._id.toString();
});

instructorRequestSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const InstructorRequest = mongoose.model('InstructorRequest', instructorRequestSchema);
