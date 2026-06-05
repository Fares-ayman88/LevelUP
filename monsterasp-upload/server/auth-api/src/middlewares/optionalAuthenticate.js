import { TokenService } from '../services/tokenService.js';
import { env } from '../config/env.js';

const tokenService = new TokenService();

const getBearerToken = (req) => {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[env.accessCookieName];
};

export function optionalAuthenticate(req, _res, next) {
  const token = getBearerToken(req);
  if (!token) return next();

  try {
    req.user = tokenService.verifyAccessToken(token);
  } catch {
    req.user = undefined;
  }

  return next();
}
