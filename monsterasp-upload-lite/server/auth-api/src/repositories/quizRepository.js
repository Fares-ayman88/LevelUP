import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';

export class QuizRepository {
  createQuiz(data) {
    return Quiz.create(data);
  }

  findQuizById(quizId, options = {}) {
    const filter = { _id: quizId };
    if (!options.includeDeleted) filter.deletedAt = null;

    let query = Quiz.findOne(filter);
    if (options.includeAnswers) {
      query = query.select('+questions.options.isCorrect +questions.correctTextAnswers');
    }
    return query;
  }

  async listQuizzes({ filter, sort, skip, limit }) {
    const [items, total] = await Promise.all([
      Quiz.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-questions.options.isCorrect -questions.correctTextAnswers')
        .lean({ virtuals: true }),
      Quiz.countDocuments(filter),
    ]);

    return { items, total };
  }

  saveQuiz(quiz) {
    return quiz.save();
  }

  async softDeleteQuiz(quiz) {
    quiz.deletedAt = new Date();
    quiz.status = 'archived';
    return quiz.save();
  }

  countStudentAttempts(quizId, studentId) {
    return QuizAttempt.countDocuments({ quizId, studentId, deletedAt: null });
  }

  createAttempt(data) {
    return QuizAttempt.create(data);
  }

  findAttemptById(attemptId) {
    return QuizAttempt.findOne({ _id: attemptId, deletedAt: null });
  }

  async listAttempts({ filter, skip, limit }) {
    const [items, total] = await Promise.all([
      QuizAttempt.find(filter)
        .sort({ scorePercent: -1, submittedAt: 1, startedAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'name email')
        .populate('quizId', 'title mode passingScorePercent')
        .lean({ virtuals: true }),
      QuizAttempt.countDocuments(filter),
    ]);

    return { items, total };
  }

  saveAttempt(attempt) {
    return attempt.save();
  }

  async updateQuizStats(quizId) {
    const [stats] = await QuizAttempt.aggregate([
      {
        $match: {
          quizId,
          deletedAt: null,
          status: { $in: ['submitted', 'graded', 'expired'] },
        },
      },
      {
        $group: {
          _id: '$quizId',
          attemptCount: { $sum: 1 },
          averageScorePercent: { $avg: '$scorePercent' },
        },
      },
    ]);

    await Quiz.updateOne(
      { _id: quizId },
      {
        $set: {
          attemptCount: stats?.attemptCount || 0,
          averageScorePercent: Math.round(stats?.averageScorePercent || 0),
        },
      },
    );
  }
}
