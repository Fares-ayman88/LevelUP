import { validationResult } from 'express-validator';
import { AppError } from '../errors/AppError.js';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return next(
    new AppError(
      'Validation failed',
      422,
      'VALIDATION_ERROR',
      errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    ),
  );
}
