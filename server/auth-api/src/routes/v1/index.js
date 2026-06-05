import { Router } from 'express';
import mongoose from 'mongoose';
import { authRoutes } from './authRoutes.js';
import { courseRoutes, enrollmentRoutes } from './courseRoutes.js';
import { videoRoutes } from './videoRoutes.js';
import { quizRoutes } from './quizRoutes.js';
import { instructorRequestRoutes } from './instructorRequestRoutes.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants/roles.js';

export const v1Routes = Router();

v1Routes.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'levelup-auth-api',
    version: 'v1',
  });
});

v1Routes.get('/ready', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  res.status(mongoReady ? 200 : 503).json({
    status: mongoReady ? 'ready' : 'not_ready',
    checks: {
      mongo: mongoReady ? 'ok' : 'unavailable',
    },
  });
});

v1Routes.use('/auth', authRoutes);
v1Routes.use('/courses', courseRoutes);
v1Routes.use('/enrollments', enrollmentRoutes);
v1Routes.use('/instructor-requests', instructorRequestRoutes);
v1Routes.use('/', videoRoutes);
v1Routes.use('/', quizRoutes);

v1Routes.get('/admin/protected-check', authenticate, authorize(ROLES.ADMIN), (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Admin authorization is working.',
  });
});
