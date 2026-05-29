import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { ROLES } from '../constants/roles.js';
import { CourseRepository } from '../repositories/courseRepository.js';
import { QuizRepository } from '../repositories/quizRepository.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { shuffleArray } from '../utils/shuffle.js';

const courseRepository = new CourseRepository();
const quizRepository = new QuizRepository();

const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 400, 'INVALID_OBJECT_ID');
  }
};

const canManageCourse = (user, course) => user.role === ROLES.ADMIN || String(course.instructorId) === user.sub;

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const sanitizeQuizForStudent = (quiz) => {
  const source = typeof quiz.toObject === 'function' ? quiz.toObject() : quiz;
  return {
    ...source,
    questions: source.questions?.map((question) => ({
      ...question,
      options: question.options?.map(({ key, text }) => ({ key, text })) || [],
      correctTextAnswers: undefined,
    })),
  };
};

const validateQuestions = (questions) => {
  if (!questions?.length) {
    throw new AppError('Quiz must include at least one question', 422, 'QUIZ_QUESTIONS_REQUIRED');
  }

  for (const [index, question] of questions.entries()) {
    if (['single_choice', 'true_false'].includes(question.type)) {
      const correctCount = (question.options || []).filter((option) => option.isCorrect).length;
      if (correctCount !== 1) {
        throw new AppError(`Question ${index + 1} must have exactly one correct option`, 422, 'INVALID_QUESTION_OPTIONS');
      }
    }

    if (question.type === 'multiple_choice') {
      const correctCount = (question.options || []).filter((option) => option.isCorrect).length;
      if (correctCount < 1) {
        throw new AppError(`Question ${index + 1} must have at least one correct option`, 422, 'INVALID_QUESTION_OPTIONS');
      }
    }

    if (question.type === 'short_answer' && !question.correctTextAnswers?.length) {
      throw new AppError(`Question ${index + 1} must include accepted text answers`, 422, 'INVALID_TEXT_ANSWER');
    }
  }
};

const buildAttemptQuestions = (quiz) => {
  let questions = [...quiz.questions].sort((a, b) => a.order - b.order);
  if (quiz.randomizeQuestions) questions = shuffleArray(questions);
  if (quiz.questionLimit > 0) questions = questions.slice(0, quiz.questionLimit);

  return questions.map((question, index) => {
    let options = (question.options || []).map(({ key, text }) => ({ key, text }));
    if (quiz.randomizeOptions) options = shuffleArray(options);

    return {
      questionId: question._id,
      type: question.type,
      prompt: question.prompt,
      options,
      points: question.points,
      order: index,
    };
  });
};

const gradeAnswer = (question, answer) => {
  if (!answer) {
    return { isCorrect: false, earnedPoints: 0 };
  }

  if (question.type === 'short_answer') {
    const expected = new Set((question.correctTextAnswers || []).map(normalizeText));
    const isCorrect = expected.has(normalizeText(answer.textAnswer));
    return { isCorrect, earnedPoints: isCorrect ? question.points : 0 };
  }

  const correct = (question.options || [])
    .filter((option) => option.isCorrect)
    .map((option) => option.key)
    .sort();
  const selected = [...new Set(answer.selectedOptionKeys || [])].sort();
  const isCorrect = correct.length === selected.length && correct.every((key, index) => key === selected[index]);
  return { isCorrect, earnedPoints: isCorrect ? question.points : 0 };
};

export class QuizService {
  async assertCanManageQuiz(quiz, user) {
    const course = await courseRepository.findCourseById(quiz.courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot manage this quiz', 403, 'FORBIDDEN');
    return course;
  }

  async assertCanTakeQuiz(quiz, user) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can take quizzes', 403, 'FORBIDDEN');
    }

    const course = await courseRepository.findCourseById(quiz.courseId);
    if (!course || course.status !== 'published' || quiz.status !== 'published') {
      throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    }

    const enrollment = await courseRepository.findEnrollment(user.sub, quiz.courseId);
    if (!enrollment || !['active', 'completed'].includes(enrollment.status)) {
      throw new AppError('You must enroll before taking this quiz', 403, 'NOT_ENROLLED');
    }

    return course;
  }

  async createQuiz(courseId, payload, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot create quizzes for this course', 403, 'FORBIDDEN');

    validateQuestions(payload.questions);

    return quizRepository.createQuiz({
      ...payload,
      courseId,
      instructorId: course.instructorId,
      status: 'draft',
    });
  }

  async updateQuiz(quizId, payload, user) {
    assertObjectId(quizId, 'quizId');
    const quiz = await quizRepository.findQuizById(quizId, { includeAnswers: true });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanManageQuiz(quiz, user);

    if (payload.questions) validateQuestions(payload.questions);

    const allowedFields = [
      'title',
      'description',
      'mode',
      'timerSeconds',
      'attemptLimit',
      'passingScorePercent',
      'randomizeQuestions',
      'randomizeOptions',
      'questionLimit',
      'showCorrectAnswers',
      'questions',
      'lessonId',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) quiz[field] = payload[field];
    }

    return quizRepository.saveQuiz(quiz);
  }

  async publishQuiz(quizId, user) {
    const quiz = await quizRepository.findQuizById(quizId, { includeAnswers: true });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanManageQuiz(quiz, user);
    validateQuestions(quiz.questions);

    quiz.status = 'published';
    return quizRepository.saveQuiz(quiz);
  }

  async unpublishQuiz(quizId, user) {
    const quiz = await quizRepository.findQuizById(quizId, { includeAnswers: true });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanManageQuiz(quiz, user);

    quiz.status = 'draft';
    return quizRepository.saveQuiz(quiz);
  }

  async deleteQuiz(quizId, user) {
    const quiz = await quizRepository.findQuizById(quizId);
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanManageQuiz(quiz, user);
    return quizRepository.softDeleteQuiz(quiz);
  }

  async listCourseQuizzes(courseId, query, user) {
    assertObjectId(courseId, 'courseId');
    const { page, limit, skip } = getPagination(query);
    const filter = { courseId, deletedAt: null };

    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');

    if (!user || !canManageCourse(user, course)) {
      filter.status = 'published';
    } else if (query.status) {
      filter.status = query.status;
    }

    if (query.mode) filter.mode = query.mode;
    if (query.q) filter.$text = { $search: query.q };

    const { items, total } = await quizRepository.listQuizzes({
      filter,
      sort: query.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 },
      skip,
      limit,
    });

    return { items, meta: buildPaginationMeta({ page, limit, total }) };
  }

  async getQuiz(quizId, user) {
    assertObjectId(quizId, 'quizId');
    const quiz = await quizRepository.findQuizById(quizId, {
      includeAnswers: user && [ROLES.ADMIN, ROLES.INSTRUCTOR].includes(user.role),
    });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');

    const course = await courseRepository.findCourseById(quiz.courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');

    if (user && canManageCourse(user, course)) return quiz;
    if (quiz.status !== 'published') throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');

    return sanitizeQuizForStudent(quiz);
  }

  async startAttempt(quizId, user) {
    assertObjectId(quizId, 'quizId');
    const quiz = await quizRepository.findQuizById(quizId, { includeAnswers: true });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanTakeQuiz(quiz, user);

    const attemptsCount = await quizRepository.countStudentAttempts(quizId, user.sub);
    if (attemptsCount >= quiz.attemptLimit) {
      throw new AppError('Attempt limit reached', 409, 'ATTEMPT_LIMIT_REACHED');
    }

    const questions = buildAttemptQuestions(quiz);
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

    return quizRepository.createAttempt({
      quizId,
      courseId: quiz.courseId,
      studentId: user.sub,
      attemptNumber: attemptsCount + 1,
      startedAt: new Date(),
      dueAt: quiz.timerSeconds > 0 ? new Date(Date.now() + quiz.timerSeconds * 1000) : undefined,
      questions,
      totalPoints,
    });
  }

  async submitAttempt(attemptId, payload, user) {
    assertObjectId(attemptId, 'attemptId');
    const attempt = await quizRepository.findAttemptById(attemptId);
    if (!attempt) throw new AppError('Attempt was not found', 404, 'ATTEMPT_NOT_FOUND');
    if (String(attempt.studentId) !== user.sub) throw new AppError('You cannot submit this attempt', 403, 'FORBIDDEN');
    if (attempt.status !== 'in_progress') throw new AppError('Attempt was already submitted', 409, 'ATTEMPT_ALREADY_SUBMITTED');

    const quiz = await quizRepository.findQuizById(attempt.quizId, { includeAnswers: true });
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');

    const expired = attempt.dueAt && attempt.dueAt < new Date();
    const submittedAnswers = new Map((payload.answers || []).map((answer) => [String(answer.questionId), answer]));

    let earnedPoints = 0;
    const gradedAnswers = attempt.questions.map((attemptQuestion) => {
      const sourceQuestion = quiz.questions.id(attemptQuestion.questionId);
      const answer = submittedAnswers.get(String(attemptQuestion.questionId));
      const grade = expired ? { isCorrect: false, earnedPoints: 0 } : gradeAnswer(sourceQuestion, answer);
      earnedPoints += grade.earnedPoints;

      return {
        questionId: attemptQuestion.questionId,
        selectedOptionKeys: answer?.selectedOptionKeys || [],
        textAnswer: answer?.textAnswer,
        isCorrect: grade.isCorrect,
        earnedPoints: grade.earnedPoints,
        gradedAt: new Date(),
      };
    });

    attempt.answers = gradedAnswers;
    attempt.earnedPoints = earnedPoints;
    attempt.scorePercent = attempt.totalPoints > 0 ? Math.round((earnedPoints / attempt.totalPoints) * 100) : 0;
    attempt.passed = attempt.scorePercent >= quiz.passingScorePercent;
    attempt.status = expired ? 'expired' : 'graded';
    attempt.submittedAt = new Date();
    attempt.gradedAt = new Date();
    await quizRepository.saveAttempt(attempt);
    await quizRepository.updateQuizStats(quiz._id);

    return attempt;
  }

  async getAttempt(attemptId, user) {
    assertObjectId(attemptId, 'attemptId');
    const attempt = await quizRepository.findAttemptById(attemptId);
    if (!attempt) throw new AppError('Attempt was not found', 404, 'ATTEMPT_NOT_FOUND');

    if (String(attempt.studentId) === user.sub) return attempt;

    const quiz = await quizRepository.findQuizById(attempt.quizId);
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    await this.assertCanManageQuiz(quiz, user);
    return attempt;
  }

  async listAttempts(query, user) {
    const { page, limit, skip } = getPagination(query);
    const filter = { deletedAt: null };

    if (query.quizId) {
      assertObjectId(query.quizId, 'quizId');
      filter.quizId = query.quizId;
    }

    if (user.role === ROLES.STUDENT) {
      filter.studentId = user.sub;
    } else if (query.studentId && user.role === ROLES.ADMIN) {
      assertObjectId(query.studentId, 'studentId');
      filter.studentId = query.studentId;
    }

    if (query.status) filter.status = query.status;

    const { items, total } = await quizRepository.listAttempts({ filter, skip, limit });
    return { items, meta: buildPaginationMeta({ page, limit, total }) };
  }

  async getLeaderboard(quizId, query, user) {
    assertObjectId(quizId, 'quizId');
    const quiz = await quizRepository.findQuizById(quizId);
    if (!quiz) throw new AppError('Quiz was not found', 404, 'QUIZ_NOT_FOUND');
    if (quiz.status !== 'published') await this.assertCanManageQuiz(quiz, user);

    const { page, limit, skip } = getPagination(query);
    const { items, total } = await quizRepository.listAttempts({
      filter: {
        quizId,
        deletedAt: null,
        status: { $in: ['submitted', 'graded', 'expired'] },
      },
      skip,
      limit,
    });

    return { items, meta: buildPaginationMeta({ page, limit, total }) };
  }
}
