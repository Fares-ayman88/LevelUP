import { body, param, query, validationResult } from 'express-validator';

export const submitInstructorRequestValidator = [
  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ max: 200 })
    .withMessage('User ID must not exceed 200 characters'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 30 })
    .withMessage('Phone number must be between 7 and 30 characters')
    .matches(/^[+]?[\d\s\-()]+$/)
    .withMessage('Phone number format is invalid'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('coursesTaken')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Courses taken must not exceed 2000 characters'),

  body('experienceYears')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Experience years must be a number between 0 and 100'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters'),
];

export const instructorRequestIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid instructor request ID'),
];

export const updateInstructorRequestStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid instructor request ID'),

  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'approved', 'rejected', 'revoked'])
    .withMessage('Status must be one of: pending, approved, rejected, revoked'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason must not exceed 1000 characters'),
];

export const listInstructorRequestsValidator = [
  query('status')
    .optional()
    .trim()
    .isIn(['pending', 'approved', 'rejected', 'revoked'])
    .withMessage('Invalid status filter'),

  query('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category filter must not exceed 100 characters'),

  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
