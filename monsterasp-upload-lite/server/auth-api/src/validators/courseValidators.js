import { body, param, query } from 'express-validator';

const objectIdParam = (name) => param(name).isMongoId().withMessage(`${name} must be a valid MongoDB id`);

const optionalObjectIdBody = (name) => body(name).optional().isMongoId().withMessage(`${name} must be a valid MongoDB id`);

const thumbnailValidator = body('thumbnail')
  .optional()
  .isObject()
  .withMessage('thumbnail must be an object');

const pricingValidator = body('pricing')
  .optional()
  .isObject()
  .withMessage('pricing must be an object');

export const createCourseValidator = [
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Title must be between 3 and 160 characters'),
  body('subtitle').optional().trim().isLength({ max: 220 }).withMessage('Subtitle cannot exceed 220 characters'),
  body('description').trim().isLength({ min: 20, max: 8000 }).withMessage('Description must be between 20 and 8000 characters'),
  body('categoryId').isMongoId().withMessage('categoryId must be a valid MongoDB id'),
  optionalObjectIdBody('instructorId'),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all']).withMessage('Invalid course level'),
  body('language').optional().trim().isLength({ min: 2, max: 12 }).withMessage('Invalid language value'),
  body('tags').optional().isArray({ max: 20 }).withMessage('tags must be an array of at most 20 items'),
  body('tags.*').optional().trim().isLength({ min: 1, max: 40 }).withMessage('Each tag must be between 1 and 40 characters'),
  thumbnailValidator,
  body('thumbnail.url').optional().isURL({ require_protocol: true }).withMessage('thumbnail.url must be a valid URL'),
  body('thumbnail.alt').optional().trim().isLength({ max: 160 }).withMessage('thumbnail.alt cannot exceed 160 characters'),
  pricingValidator,
  body('pricing.amount').optional().isFloat({ min: 0 }).withMessage('pricing.amount must be 0 or greater'),
  body('pricing.currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('pricing.currency must be 3 characters'),
  body('pricing.isFree').optional().isBoolean().withMessage('pricing.isFree must be boolean'),
  body('totalLessons').optional().isInt({ min: 0 }).withMessage('totalLessons must be 0 or greater'),
  body('totalDurationSeconds').optional().isInt({ min: 0 }).withMessage('totalDurationSeconds must be 0 or greater'),
];

export const updateCourseValidator = [
  objectIdParam('courseId'),
  body('title').optional().trim().isLength({ min: 3, max: 160 }).withMessage('Title must be between 3 and 160 characters'),
  body('subtitle').optional().trim().isLength({ max: 220 }).withMessage('Subtitle cannot exceed 220 characters'),
  body('description').optional().trim().isLength({ min: 20, max: 8000 }).withMessage('Description must be between 20 and 8000 characters'),
  optionalObjectIdBody('categoryId'),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all']).withMessage('Invalid course level'),
  body('language').optional().trim().isLength({ min: 2, max: 12 }).withMessage('Invalid language value'),
  body('tags').optional().isArray({ max: 20 }).withMessage('tags must be an array of at most 20 items'),
  body('tags.*').optional().trim().isLength({ min: 1, max: 40 }).withMessage('Each tag must be between 1 and 40 characters'),
  thumbnailValidator,
  body('thumbnail.url').optional().isURL({ require_protocol: true }).withMessage('thumbnail.url must be a valid URL'),
  body('thumbnail.alt').optional().trim().isLength({ max: 160 }).withMessage('thumbnail.alt cannot exceed 160 characters'),
  pricingValidator,
  body('pricing.amount').optional().isFloat({ min: 0 }).withMessage('pricing.amount must be 0 or greater'),
  body('pricing.currency').optional().trim().isLength({ min: 3, max: 3 }).withMessage('pricing.currency must be 3 characters'),
  body('pricing.isFree').optional().isBoolean().withMessage('pricing.isFree must be boolean'),
  body('totalLessons').optional().isInt({ min: 0 }).withMessage('totalLessons must be 0 or greater'),
  body('totalDurationSeconds').optional().isInt({ min: 0 }).withMessage('totalDurationSeconds must be 0 or greater'),
];

export const listCoursesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('q').optional().trim().isLength({ max: 120 }).withMessage('q cannot exceed 120 characters'),
  query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all']).withMessage('Invalid course level'),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'rating']).withMessage('Invalid sort value'),
  query('categoryId').optional().isMongoId().withMessage('categoryId must be a valid MongoDB id'),
  query('instructorId').optional().isMongoId().withMessage('instructorId must be a valid MongoDB id'),
  query('mine').optional().isBoolean().withMessage('mine must be boolean'),
];

export const courseIdValidator = [objectIdParam('courseId')];

export const createCategoryValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('slug').optional().trim().isLength({ min: 2, max: 90 }).withMessage('Slug must be between 2 and 90 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('parentId').optional({ nullable: true }).isMongoId().withMessage('parentId must be a valid MongoDB id'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

export const listEnrollmentsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('courseId').optional().isMongoId().withMessage('courseId must be a valid MongoDB id'),
  query('status').optional().isIn(['active', 'completed', 'cancelled']).withMessage('Invalid enrollment status'),
];

export const updateProgressValidator = [
  objectIdParam('courseId'),
  body('lessonId').isMongoId().withMessage('lessonId must be a valid MongoDB id'),
  body('watchedSeconds').optional().isInt({ min: 0 }).withMessage('watchedSeconds must be 0 or greater'),
  body('completed').optional().isBoolean().withMessage('completed must be boolean'),
];
