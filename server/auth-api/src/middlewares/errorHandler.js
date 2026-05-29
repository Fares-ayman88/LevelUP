import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const normalizeError = (error) => {
  if (error instanceof AppError) return error;

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError('Validation failed', 422, 'VALIDATION_ERROR', error.errors);
  }

  if (error?.code === 11000) {
    return new AppError('Duplicate value already exists', 409, 'DUPLICATE_KEY', error.keyValue);
  }

  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    return new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('Uploaded file is too large', 413, 'FILE_TOO_LARGE');
    }
    return new AppError(error.message, 422, error.code || 'UPLOAD_ERROR');
  }

  return new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
};

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(error, _req, res, _next) {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    logger.error(normalized.message, error);
  }

  res.status(normalized.statusCode).json({
    status: 'error',
    code: normalized.code,
    message: normalized.message,
    details: normalized.details,
    stack: env.nodeEnv === 'development' ? error.stack : undefined,
  });
}
