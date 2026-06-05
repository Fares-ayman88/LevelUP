import { Router } from 'express';
import { videoController } from '../../controllers/videoController.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { uploadVideo } from '../../middlewares/uploadVideo.js';
import { uploadRateLimiter } from '../../middlewares/rateLimiters.js';
import { validate } from '../../middlewares/validate.js';
import {
  courseVideoListValidator,
  uploadCourseVideoValidator,
  videoIdValidator,
  videoProgressValidator,
} from '../../validators/videoValidators.js';

export const videoRoutes = Router();

videoRoutes.get('/courses/:courseId/videos', authenticate, courseVideoListValidator, validate, videoController.listCourseVideos);
videoRoutes.post(
  '/courses/:courseId/videos',
  authenticate,
  uploadRateLimiter,
  uploadVideo.single('video'),
  uploadCourseVideoValidator,
  validate,
  videoController.uploadCourseVideo,
);

videoRoutes.get('/videos/:videoId/stream-url', authenticate, videoIdValidator, validate, videoController.getSignedStream);
videoRoutes.post(
  '/videos/:videoId/retry-upload',
  authenticate,
  uploadRateLimiter,
  uploadVideo.single('video'),
  videoIdValidator,
  validate,
  videoController.retryUpload,
);
videoRoutes.get('/videos/:videoId/progress', authenticate, videoIdValidator, validate, videoController.getProgress);
videoRoutes.patch('/videos/:videoId/progress', authenticate, videoProgressValidator, validate, videoController.updateProgress);
