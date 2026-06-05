import { body, param, query } from 'express-validator';

const questionTypes = ['single_choice', 'multiple_choice', 'true_false', 'short_answer'];

const questionValidators = [
  body('questions').isArray({ min: 1, max: 200 }).withMessage('questions must include 1 to 200 questions'),
  body('questions.*.type').isIn(questionTypes).withMessage('Invalid question type'),
  body('questions.*.prompt').trim().isLength({ min: 3, max: 4000 }).withMessage('Question prompt must be between 3 and 4000 characters'),
  body('questions.*.explanation').optional().trim().isLength({ max: 2000 }).withMessage('Explanation cannot exceed 2000 characters'),
  body('questions.*.points').optional().isInt({ min: 1, max: 100 }).withMessage('points must be between 1 and 100'),
  body('questions.*.order').optional().isInt({ min: 0 }).withMessage('order must be 0 or greater'),
  body('questions.*.options').optional().isArray({ max: 20 }).withMessage('options must be an array with at most 20 items'),
  body('questions.*.options.*.key').optional().trim().isLength({ min: 1, max: 24 }).withMessage('Option key must be between 1 and 24 characters'),
  body('questions.*.options.*.text').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Option text must be between 1 and 1000 characters'),
  body('questions.*.options.*.isCorrect').optional().isBoolean().withMessage('isCorrect must be boolean'),
  body('questions.*.correctTextAnswers').optional().isArray({ max: 20 }).withMessage('correctTextAnswers must contain at most 20 values'),
  body('questions.*.correctTextAnswers.*').optional().trim().isLength({ min: 1, max: 400 }).withMessage('Text answer must be between 1 and 400 characters'),
  body('questions.*.tags').optional().isArray({ max: 20 }).withMessage('Question tags must contain at most 20 values'),
];

const quizSettingsValidators = [
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Title must be between 3 and 160 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('lessonId').optional().isMongoId().withMessage('lessonId must be a valid MongoDB id'),
  body('mode').optional().isIn(['quiz', 'exam']).withMessage('mode must be quiz or exam'),
  body('timerSeconds').optional().isInt({ min: 0, max: 86400 }).withMessage('timerSeconds must be between 0 and 86400'),
  body('attemptLimit').optional().isInt({ min: 1, max: 100 }).withMessage('attemptLimit must be between 1 and 100'),
  body('passingScorePercent').optional().isInt({ min: 0, max: 100 }).withMessage('passingScorePercent must be between 0 and 100'),
  body('randomizeQuestions').optional().isBoolean().withMessage('randomizeQuestions must be boolean'),
  body('randomizeOptions').optional().isBoolean().withMessage('randomizeOptions must be boolean'),
  body('questionLimit').optional().isInt({ min: 0, max: 200 }).withMessage('questionLimit must be between 0 and 200'),
  body('showCorrectAnswers').optional().isBoolean().withMessage('showCorrectAnswers must be boolean'),
];

export const createQuizValidator = [
  param('courseId').isMongoId().withMessage('courseId must be a valid MongoDB id'),
  ...quizSettingsValidators,
  ...questionValidators,
];

export const updateQuizValidator = [
  param('quizId').isMongoId().withMessage('quizId must be a valid MongoDB id'),
  body('title').optional().trim().isLength({ min: 3, max: 160 }).withMessage('Title must be between 3 and 160 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('lessonId').optional().isMongoId().withMessage('lessonId must be a valid MongoDB id'),
  body('mode').optional().isIn(['quiz', 'exam']).withMessage('mode must be quiz or exam'),
  body('timerSeconds').optional().isInt({ min: 0, max: 86400 }).withMessage('timerSeconds must be between 0 and 86400'),
  body('attemptLimit').optional().isInt({ min: 1, max: 100 }).withMessage('attemptLimit must be between 1 and 100'),
  body('passingScorePercent').optional().isInt({ min: 0, max: 100 }).withMessage('passingScorePercent must be between 0 and 100'),
  body('randomizeQuestions').optional().isBoolean().withMessage('randomizeQuestions must be boolean'),
  body('randomizeOptions').optional().isBoolean().withMessage('randomizeOptions must be boolean'),
  body('questionLimit').optional().isInt({ min: 0, max: 200 }).withMessage('questionLimit must be between 0 and 200'),
  body('showCorrectAnswers').optional().isBoolean().withMessage('showCorrectAnswers must be boolean'),
  body('questions').optional().isArray({ min: 1, max: 200 }).withMessage('questions must include 1 to 200 questions'),
  body('questions.*.type').optional().isIn(questionTypes).withMessage('Invalid question type'),
  body('questions.*.prompt').optional().trim().isLength({ min: 3, max: 4000 }).withMessage('Question prompt must be between 3 and 4000 characters'),
  body('questions.*.options').optional().isArray({ max: 20 }).withMessage('options must contain at most 20 items'),
  body('questions.*.correctTextAnswers').optional().isArray({ max: 20 }).withMessage('correctTextAnswers must contain at most 20 values'),
];

export const quizIdValidator = [param('quizId').isMongoId().withMessage('quizId must be a valid MongoDB id')];

export const attemptIdValidator = [param('attemptId').isMongoId().withMessage('attemptId must be a valid MongoDB id')];

export const listCourseQuizzesValidator = [
  param('courseId').isMongoId().withMessage('courseId must be a valid MongoDB id'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  query('mode').optional().isIn(['quiz', 'exam']).withMessage('mode must be quiz or exam'),
  query('q').optional().trim().isLength({ max: 120 }).withMessage('q cannot exceed 120 characters'),
];

export const submitAttemptValidator = [
  param('attemptId').isMongoId().withMessage('attemptId must be a valid MongoDB id'),
  body('answers').isArray({ min: 0, max: 300 }).withMessage('answers must be an array'),
  body('answers.*.questionId').isMongoId().withMessage('questionId must be a valid MongoDB id'),
  body('answers.*.selectedOptionKeys').optional().isArray({ max: 20 }).withMessage('selectedOptionKeys must contain at most 20 values'),
  body('answers.*.selectedOptionKeys.*').optional().trim().isLength({ min: 1, max: 24 }).withMessage('selectedOptionKeys values are invalid'),
  body('answers.*.textAnswer').optional().trim().isLength({ max: 4000 }).withMessage('textAnswer cannot exceed 4000 characters'),
];

export const listAttemptsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('quizId').optional().isMongoId().withMessage('quizId must be a valid MongoDB id'),
  query('studentId').optional().isMongoId().withMessage('studentId must be a valid MongoDB id'),
  query('status').optional().isIn(['in_progress', 'submitted', 'expired', 'graded']).withMessage('Invalid status'),
];
