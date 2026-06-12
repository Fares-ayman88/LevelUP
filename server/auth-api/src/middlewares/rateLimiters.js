import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const normalizeIp = (value) => {
  const ip = String(value || '').split(',')[0].trim();
  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) {
    return ipv4WithPort[1];
  }
  if (ip.startsWith('[')) {
    return ip.slice(1, ip.indexOf(']'));
  }
  return ip || 'unknown';
};

const requestIpKey = (req) => normalizeIp(req.get('x-forwarded-for') || req.ip || req.socket?.remoteAddress);

const proxyValidation = {
  ip: false,
  xForwardedForHeader: false,
  trustProxy: false,
};

export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: requestIpKey,
  validate: proxyValidation,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: requestIpKey,
  validate: proxyValidation,
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
  keyGenerator: requestIpKey,
  validate: proxyValidation,
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
  keyGenerator: (req) => req.user?.sub || requestIpKey(req),
  validate: proxyValidation,
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
  keyGenerator: (req) => req.body?.email || requestIpKey(req),
  validate: proxyValidation,
  message: {
    status: 'error',
    code: 'TOO_MANY_INSTRUCTOR_REQUESTS',
    message: 'Too many instructor requests. Please try again later.',
  },
});

