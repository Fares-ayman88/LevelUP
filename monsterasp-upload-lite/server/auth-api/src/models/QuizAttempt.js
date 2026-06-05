import mongoose from 'mongoose';

const attemptQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
      required: true,
    },
    prompt: { type: String, required: true },
    options: {
      type: [
        {
          key: { type: String, required: true },
          text: { type: String, required: true },
        },
      ],
      default: [],
    },
    points: { type: Number, min: 1, required: true },
    order: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionKeys: { type: [String], default: [] },
    textAnswer: { type: String, trim: true, maxlength: 4000 },
    isCorrect: { type: Boolean, default: false },
    earnedPoints: { type: Number, min: 0, default: 0 },
    gradedAt: { type: Date },
  },
  { _id: false },
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      min: 1,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired', 'graded'],
      default: 'in_progress',
      index: true,
    },
    startedAt: { type: Date, default: Date.now, index: true },
    dueAt: { type: Date, index: true },
    submittedAt: { type: Date },
    gradedAt: { type: Date },
    questions: {
      type: [attemptQuestionSchema],
      required: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    totalPoints: { type: Number, min: 0, default: 0 },
    earnedPoints: { type: Number, min: 0, default: 0 },
    scorePercent: { type: Number, min: 0, max: 100, default: 0, index: true },
    passed: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

quizAttemptSchema.index({ quizId: 1, studentId: 1, attemptNumber: -1 });
quizAttemptSchema.index({ quizId: 1, scorePercent: -1, submittedAt: 1 });
quizAttemptSchema.index({ studentId: 1, courseId: 1, updatedAt: -1 });
quizAttemptSchema.index({ status: 1, dueAt: 1 });

quizAttemptSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
