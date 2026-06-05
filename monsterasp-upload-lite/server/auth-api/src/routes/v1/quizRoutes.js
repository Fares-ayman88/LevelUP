import { Router } from 'express';
import { quizController } from '../../controllers/quizController.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { optionalAuthenticate } from '../../middlewares/optionalAuthenticate.js';
import { validate } from '../../middlewares/validate.js';
import {
  attemptIdValidator,
  createQuizValidator,
  listAttemptsValidator,
  listCourseQuizzesValidator,
  quizIdValidator,
  submitAttemptValidator,
  updateQuizValidator,
} from '../../validators/quizValidators.js';

export const quizRoutes = Router();

quizRoutes.get('/courses/:courseId/quizzes', optionalAuthenticate, listCourseQuizzesValidator, validate, quizController.listCourseQuizzes);
quizRoutes.post('/courses/:courseId/quizzes', authenticate, createQuizValidator, validate, quizController.createQuiz);

quizRoutes.get('/quizzes/:quizId', optionalAuthenticate, quizIdValidator, validate, quizController.getQuiz);
quizRoutes.patch('/quizzes/:quizId', authenticate, updateQuizValidator, validate, quizController.updateQuiz);
quizRoutes.delete('/quizzes/:quizId', authenticate, quizIdValidator, validate, quizController.deleteQuiz);
quizRoutes.post('/quizzes/:quizId/publish', authenticate, quizIdValidator, validate, quizController.publishQuiz);
quizRoutes.post('/quizzes/:quizId/unpublish', authenticate, quizIdValidator, validate, quizController.unpublishQuiz);
quizRoutes.post('/quizzes/:quizId/attempts', authenticate, quizIdValidator, validate, quizController.startAttempt);
quizRoutes.get('/quizzes/:quizId/leaderboard', optionalAuthenticate, quizIdValidator, validate, quizController.leaderboard);

quizRoutes.get('/quiz-attempts', authenticate, listAttemptsValidator, validate, quizController.listAttempts);
quizRoutes.get('/quiz-attempts/:attemptId', authenticate, attemptIdValidator, validate, quizController.getAttempt);
quizRoutes.post('/quiz-attempts/:attemptId/submit', authenticate, submitAttemptValidator, validate, quizController.submitAttempt);
