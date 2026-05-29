import { body } from 'express-validator';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8, max: 72 })
  .withMessage('Password must be between 8 and 72 characters')
  .matches(/[a-z]/)
  .withMessage('Password must include a lowercase letter')
  .matches(/[A-Z]/)
  .withMessage('Password must include an uppercase letter')
  .matches(/\d/)
  .withMessage('Password must include a number');

export const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  passwordRule,
  body('role')
    .optional()
    .isIn([ROLES.STUDENT, ROLES.INSTRUCTOR])
    .withMessage(`Role must be one of: ${[ROLES.STUDENT, ROLES.INSTRUCTOR].join(', ')}`),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

export const emailValidator = [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')];

export const tokenValidator = [body('token').isString().isLength({ min: 32 }).withMessage('Valid token is required')];

export const resetPasswordValidator = [
  body('token').isString().isLength({ min: 32 }).withMessage('Valid token is required'),
  passwordRule,
];

export const roleUpdateValidator = [
  body('role').isIn(ROLE_VALUES).withMessage(`Role must be one of: ${ROLE_VALUES.join(', ')}`),
];
