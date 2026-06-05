import express from 'express';
import morgan from 'morgan';
import { applySecurityMiddleware } from './middlewares/security.js';
import { requestId } from './middlewares/requestId.js';
import { csrfProtection } from './middlewares/csrfProtection.js';
import { securityLogger } from './middlewares/securityLogger.js';
import { globalRateLimiter } from './middlewares/rateLimiters.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { uploadCleanupOnError } from './middlewares/uploadCleanup.js';
import { v1Routes } from './routes/v1/index.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(requestId);
  applySecurityMiddleware(app);
  app.use(securityLogger);

  if (env.nodeEnv !== 'test') {
    morgan.token('id', (req) => req.id);
    app.use(morgan(env.nodeEnv === 'production' ? ':id :remote-addr :method :url :status :res[content-length] - :response-time ms' : 'dev'));
  }

  app.use(globalRateLimiter);
  app.use(csrfProtection);
  app.use(`/api/${env.apiVersion}`, v1Routes);
  app.use(notFoundHandler);
  app.use(uploadCleanupOnError);
  app.use(errorHandler);

  return app;
}
