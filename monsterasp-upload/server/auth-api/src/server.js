import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.port, async () => {
  try {
    await connectDatabase();
    logger.info(`Auth API running on http://localhost:${env.port}/api/${env.apiVersion}`);
  } catch (error) {
    logger.error('Failed to start auth API', error);
    process.exit(1);
  }
});

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down auth API.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});
