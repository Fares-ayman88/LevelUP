import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_AUTH_REQUESTS',
    message: 'Too many authentication requests. Please try again later.',
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_PASSWORD_RESET_REQUESTS',
    message: 'Too many password reset requests. Please try again later.',
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: env.uploadRateLimitWindowMs,
  max: env.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub || req.ip,
  message: {
    status: 'error',
    code: 'TOO_MANY_UPLOAD_REQUESTS',
    message: 'Too many upload requests. Please try again later.',
  },
});

export const instructorRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: {
    status: 'error',
    code: 'TOO_MANY_INSTRUCTOR_REQUESTS',
    message: 'Too many instructor requests. Please try again later.',
  },
});

