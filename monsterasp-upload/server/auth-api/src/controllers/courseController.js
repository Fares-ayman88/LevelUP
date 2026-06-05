import { CourseService } from '../services/courseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const courseService = new CourseService();

export const courseController = {
  createCourse: asyncHandler(async (req, res) => {
    const course = await courseService.createCourse(req.body, req.user);
    res.status(201).json({ status: 'success', data: { course } });
  }),

  updateCourse: asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.params.courseId, req.body, req.user);
    res.status(200).json({ status: 'success', data: { course } });
  }),

  deleteCourse: asyncHandler(async (req, res) => {
    await courseService.deleteCourse(req.params.courseId, req.user);
    res.status(204).send();
  }),

  publishCourse: asyncHandler(async (req, res) => {
    const course = await courseService.publishCourse(req.params.courseId, req.user);
    res.status(200).json({ status: 'success', data: { course } });
  }),

  unpublishCourse: asyncHandler(async (req, res) => {
    const course = await courseService.unpublishCourse(req.params.courseId, req.user);
    res.status(200).json({ status: 'success', data: { course } });
  }),

  getCourse: asyncHandler(async (req, res) => {
    const course = await courseService.getCourse(req.params.courseIdOrSlug, req.user);
    res.status(200).json({ status: 'success', data: { course } });
  }),

  listCourses: asyncHandler(async (req, res) => {
    const result = await courseService.listCourses(req.query, req.user);
    res.status(200).json({ status: 'success', data: result });
  }),

  createCategory: asyncHandler(async (req, res) => {
    const category = await courseService.createCategory(req.body, req.user);
    res.status(201).json({ status: 'success', data: { category } });
  }),

  listCategories: asyncHandler(async (_req, res) => {
    const categories = await courseService.listCategories();
    res.status(200).json({ status: 'success', data: { categories } });
  }),

  enroll: asyncHandler(async (req, res) => {
    const enrollment = await courseService.enroll(req.params.courseId, req.user);
    res.status(201).json({ status: 'success', data: { enrollment } });
  }),

  listEnrollments: asyncHandler(async (req, res) => {
    const result = await courseService.listEnrollments(req.query, req.user);
    res.status(200).json({ status: 'success', data: result });
  }),

  updateProgress: asyncHandler(async (req, res) => {
    const progress = await courseService.updateProgress(req.params.courseId, req.body, req.user);
    res.status(200).json({ status: 'success', data: { progress } });
  }),

  getProgress: asyncHandler(async (req, res) => {
    const progress = await courseService.getProgress(req.params.courseId, req.user);
    res.status(200).json({ status: 'success', data: { progress } });
  }),
};
