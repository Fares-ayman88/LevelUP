import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (error) => logger.error('MongoDB error', error));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    serverSelectionTimeoutMS: 10000,
  });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
