import { QuizService } from '../services/quizService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const quizService = new QuizService();

export const quizController = {
  createQuiz: asyncHandler(async (req, res) => {
    const quiz = await quizService.createQuiz(req.params.courseId, req.body, req.user);
    res.status(201).json({ status: 'success', data: { quiz } });
  }),

  updateQuiz: asyncHandler(async (req, res) => {
    const quiz = await quizService.updateQuiz(req.params.quizId, req.body, req.user);
    res.status(200).json({ status: 'success', data: { quiz } });
  }),

  publishQuiz: asyncHandler(async (req, res) => {
    const quiz = await quizService.publishQuiz(req.params.quizId, req.user);
    res.status(200).json({ status: 'success', data: { quiz } });
  }),

  unpublishQuiz: asyncHandler(async (req, res) => {
    const quiz = await quizService.unpublishQuiz(req.params.quizId, req.user);
    res.status(200).json({ status: 'success', data: { quiz } });
  }),

  deleteQuiz: asyncHandler(async (req, res) => {
    await quizService.deleteQuiz(req.params.quizId, req.user);
    res.status(204).send();
  }),

  listCourseQuizzes: asyncHandler(async (req, res) => {
    const result = await quizService.listCourseQuizzes(req.params.courseId, req.query, req.user);
    res.status(200).json({ status: 'success', data: result });
  }),

  getQuiz: asyncHandler(async (req, res) => {
    const quiz = await quizService.getQuiz(req.params.quizId, req.user);
    res.status(200).json({ status: 'success', data: { quiz } });
  }),

  startAttempt: asyncHandler(async (req, res) => {
    const attempt = await quizService.startAttempt(req.params.quizId, req.user);
    res.status(201).json({ status: 'success', data: { attempt } });
  }),

  submitAttempt: asyncHandler(async (req, res) => {
    const attempt = await quizService.submitAttempt(req.params.attemptId, req.body, req.user);
    res.status(200).json({ status: 'success', data: { attempt } });
  }),

  getAttempt: asyncHandler(async (req, res) => {
    const attempt = await quizService.getAttempt(req.params.attemptId, req.user);
    res.status(200).json({ status: 'success', data: { attempt } });
  }),

  listAttempts: asyncHandler(async (req, res) => {
    const result = await quizService.listAttempts(req.query, req.user);
    res.status(200).json({ status: 'success', data: result });
  }),

  leaderboard: asyncHandler(async (req, res) => {
    const result = await quizService.getLeaderboard(req.params.quizId, req.query, req.user);
    res.status(200).json({ status: 'success', data: result });
  }),
};
