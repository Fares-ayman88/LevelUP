import { body, param } from 'express-validator';

export const uploadCourseVideoValidator = [
  param('courseId').isMongoId().withMessage('courseId must be a valid MongoDB id'),
  body('lessonId').optional().isMongoId().withMessage('lessonId must be a valid MongoDB id'),
  body('title').trim().isLength({ min: 2, max: 160 }).withMessage('Title must be between 2 and 160 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
];

export const courseVideoListValidator = [
  param('courseId').isMongoId().withMessage('courseId must be a valid MongoDB id'),
];

export const videoIdValidator = [
  param('videoId').isMongoId().withMessage('videoId must be a valid MongoDB id'),
];

export const videoProgressValidator = [
  param('videoId').isMongoId().withMessage('videoId must be a valid MongoDB id'),
  body('watchedSeconds').isFloat({ min: 0 }).withMessage('watchedSeconds must be 0 or greater'),
  body('durationSeconds').optional().isFloat({ min: 0 }).withMessage('durationSeconds must be 0 or greater'),
  body('completed').optional().isBoolean().withMessage('completed must be boolean'),
];
