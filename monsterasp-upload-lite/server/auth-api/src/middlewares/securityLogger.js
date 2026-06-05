import { logger } from '../utils/logger.js';

export function securityLogger(req, res, next) {
  res.on('finish', () => {
    if (![401, 403, 429].includes(res.statusCode)) return;

    logger.warn('Security-sensitive response', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      userId: req.user?.sub,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}
