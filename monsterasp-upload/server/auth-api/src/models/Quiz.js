import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 24 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    isCorrect: { type: Boolean, default: false, select: false },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 4000,
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    correctTextAnswers: {
      type: [String],
      default: [],
      select: false,
    },
    points: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },
    order: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const quizSchema = new mongoose.Schema(
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
      minlength: 3,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    mode: {
      type: String,
      enum: ['quiz', 'exam'],
      default: 'quiz',
      index: true,
    },
    timerSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    attemptLimit: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },
    passingScorePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },
    questionLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    totalPoints: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    attemptCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    averageScorePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

quizSchema.index({ courseId: 1, status: 1, deletedAt: 1, createdAt: -1 });
quizSchema.index({ instructorId: 1, deletedAt: 1, createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text', 'questions.prompt': 'text' });

quizSchema.pre('save', function calculateTotalPoints(next) {
  this.totalPoints = this.questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  next();
});

quizSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Quiz = mongoose.model('Quiz', quizSchema);
