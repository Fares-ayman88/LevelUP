import { TokenService } from '../services/tokenService.js';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

const tokenService = new TokenService();

const getBearerToken = (req) => {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return req.cookies?.[env.accessCookieName];
};

export function authenticate(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError('Authentication is required', 401, 'AUTH_REQUIRED');
    }

    req.user = tokenService.verifyAccessToken(token);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'));
  }
}
