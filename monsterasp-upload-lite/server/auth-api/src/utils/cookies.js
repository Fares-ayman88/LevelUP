import { env, isProduction } from '../config/env.js';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: env.cookieDomain,
  path: '/',
};

export function setAuthCookies(res, { accessToken, refreshToken, refreshExpiresAt }) {
  res.cookie(env.accessCookieName, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie(env.refreshCookieName, refreshToken, {
    ...baseCookieOptions,
    maxAge: Math.max(refreshExpiresAt.getTime() - Date.now(), 0),
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(env.accessCookieName, baseCookieOptions);
  res.clearCookie(env.refreshCookieName, baseCookieOptions);
}
