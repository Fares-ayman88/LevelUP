import { Router } from 'express';
import { courseController } from '../../controllers/courseController.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { optionalAuthenticate } from '../../middlewares/optionalAuthenticate.js';
import { validate } from '../../middlewares/validate.js';
import {
  courseIdValidator,
  createCategoryValidator,
  createCourseValidator,
  listCoursesValidator,
  listEnrollmentsValidator,
  updateCourseValidator,
  updateProgressValidator,
} from '../../validators/courseValidators.js';

export const courseRoutes = Router();

courseRoutes.get('/categories', courseController.listCategories);
courseRoutes.post('/categories', authenticate, createCategoryValidator, validate, courseController.createCategory);

courseRoutes.get('/', optionalAuthenticate, listCoursesValidator, validate, courseController.listCourses);
courseRoutes.post('/', authenticate, createCourseValidator, validate, courseController.createCourse);
courseRoutes.get('/:courseIdOrSlug', optionalAuthenticate, courseController.getCourse);
courseRoutes.patch('/:courseId', authenticate, updateCourseValidator, validate, courseController.updateCourse);
courseRoutes.delete('/:courseId', authenticate, courseIdValidator, validate, courseController.deleteCourse);
courseRoutes.post('/:courseId/publish', authenticate, courseIdValidator, validate, courseController.publishCourse);
courseRoutes.post('/:courseId/unpublish', authenticate, courseIdValidator, validate, courseController.unpublishCourse);
courseRoutes.post('/:courseId/enroll', authenticate, courseIdValidator, validate, courseController.enroll);
courseRoutes.get('/:courseId/progress', authenticate, courseIdValidator, validate, courseController.getProgress);
courseRoutes.patch('/:courseId/progress', authenticate, updateProgressValidator, validate, courseController.updateProgress);

export const enrollmentRoutes = Router();

enrollmentRoutes.get('/', authenticate, listEnrollmentsValidator, validate, courseController.listEnrollments);
