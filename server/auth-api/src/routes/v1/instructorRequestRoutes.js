import { Router } from 'express';
import { instructorRequestController } from '../../controllers/instructorRequestController.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants/roles.js';
import { validate } from '../../middlewares/validate.js';
import { instructorRequestRateLimiter } from '../../middlewares/rateLimiters.js';
import {
  submitInstructorRequestValidator,
  instructorRequestIdValidator,
  updateInstructorRequestStatusValidator,
  listInstructorRequestsValidator,
} from '../../validators/instructorRequestValidators.js';

export const instructorRequestRoutes = Router();

// Public endpoint - submit instructor request (with rate limiting)
instructorRequestRoutes.post(
  '/',
  instructorRequestRateLimiter,
  submitInstructorRequestValidator,
  validate,
  instructorRequestController.submit,
);

// Admin endpoints
instructorRequestRoutes.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  listInstructorRequestsValidator,
  validate,
  instructorRequestController.list,
);

instructorRequestRoutes.get(
  '/stats',
  authenticate,
  authorize(ROLES.ADMIN),
  instructorRequestController.stats,
);

instructorRequestRoutes.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  instructorRequestIdValidator,
  validate,
  instructorRequestController.get,
);

instructorRequestRoutes.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.ADMIN),
  updateInstructorRequestStatusValidator,
  validate,
  instructorRequestController.updateStatus,
);

instructorRequestRoutes.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  instructorRequestIdValidator,
  validate,
  instructorRequestController.delete,
);
