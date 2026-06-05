import crypto from 'crypto';
import { env, isProduction } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const cookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: env.cookieDomain,
  path: '/',
};

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(req, res) {
  const token = req.cookies?.[env.csrf.cookieName] || createCsrfToken();
  res.cookie(env.csrf.cookieName, token, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
}

export function csrfProtection(req, res, next) {
  if (!env.csrf.enabled) {
    return next();
  }

  if (!unsafeMethods.has(req.method)) {
    setCsrfCookie(req, res);
    return next();
  }

  const hasCookieAuth = Boolean(req.cookies?.[env.accessCookieName] || req.cookies?.[env.refreshCookieName]);
  const hasBearerAuth = req.get('authorization')?.startsWith('Bearer ');

  if (hasBearerAuth && !hasCookieAuth) {
    return next();
  }

  const cookieToken = req.cookies?.[env.csrf.cookieName];
  const headerToken = req.get(env.csrf.headerName);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError('Invalid CSRF token', 403, 'INVALID_CSRF_TOKEN'));
  }

  return next();
}
