import { VideoService } from '../services/videoService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const videoService = new VideoService();

export const videoController = {
  uploadCourseVideo: asyncHandler(async (req, res) => {
    const video = await videoService.uploadCourseVideo({
      courseId: req.params.courseId,
      payload: req.body,
      file: req.file,
      user: req.user,
    });

    res.status(201).json({
      status: 'success',
      data: { video },
    });
  }),

  listCourseVideos: asyncHandler(async (req, res) => {
    const videos = await videoService.listCourseVideos(req.params.courseId, req.user);
    res.status(200).json({
      status: 'success',
      data: { videos },
    });
  }),

  getSignedStream: asyncHandler(async (req, res) => {
    const stream = await videoService.getSignedStream(req.params.videoId, req.user);
    res.status(200).json({
      status: 'success',
      data: stream,
    });
  }),

  retryUpload: asyncHandler(async (req, res) => {
    const video = await videoService.retryUpload(req.params.videoId, req.file, req.user);
    res.status(201).json({
      status: 'success',
      data: { video },
    });
  }),

  updateProgress: asyncHandler(async (req, res) => {
    const progress = await videoService.updateProgress(req.params.videoId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      data: { progress },
    });
  }),

  getProgress: asyncHandler(async (req, res) => {
    const progress = await videoService.getProgress(req.params.videoId, req.user);
    res.status(200).json({
      status: 'success',
      data: { progress },
    });
  }),
};
