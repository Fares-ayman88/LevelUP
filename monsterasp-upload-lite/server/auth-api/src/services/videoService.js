import mongoose from 'mongoose';
import path from 'path';
import { cloudinary, configureCloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../errors/AppError.js';
import { CourseRepository } from '../repositories/courseRepository.js';
import { VideoRepository } from '../repositories/videoRepository.js';
import { removeFileIfExists } from '../utils/fileCleanup.js';
import { withRetry } from '../utils/retry.js';

const courseRepository = new CourseRepository();
const videoRepository = new VideoRepository();

const assertObjectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${label}`, 400, 'INVALID_OBJECT_ID');
  }
};

const canManageCourse = (user, course) => user.role === ROLES.ADMIN || String(course.instructorId) === user.sub;

const getPublicId = ({ courseId, lessonId, filename }) => {
  const basename = path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9_-]/g, '');
  return `${env.cloudinary.folder}/${courseId}/${lessonId || 'course'}/${basename}`;
};

export class VideoService {
  ensureCloudinaryConfigured() {
    configureCloudinary();
  }

  async assertCanAccessVideo(video, user) {
    const course = await courseRepository.findCourseById(video.courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');

    if (canManageCourse(user, course)) return course;

    if (user.role === ROLES.STUDENT && course.status === 'published') {
      const enrollment = await courseRepository.findEnrollment(user.sub, course.id);
      if (enrollment && ['active', 'completed'].includes(enrollment.status)) return course;
    }

    throw new AppError('You cannot access this video', 403, 'VIDEO_ACCESS_DENIED');
  }

  async uploadCourseVideo({ courseId, payload, file, user }) {
    assertObjectId(courseId, 'courseId');
    if (payload.lessonId) assertObjectId(payload.lessonId, 'lessonId');

    if (!file) {
      throw new AppError('Video file is required', 422, 'VIDEO_FILE_REQUIRED');
    }

    this.ensureCloudinaryConfigured();

    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');
    if (!canManageCourse(user, course)) throw new AppError('You cannot upload videos to this course', 403, 'FORBIDDEN');

    const video = await videoRepository.createVideo({
      courseId,
      lessonId: payload.lessonId,
      instructorId: course.instructorId,
      title: payload.title,
      description: payload.description,
      status: 'uploading',
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadAttempts: 0,
    });

    const publicId = getPublicId({ courseId, lessonId: payload.lessonId, filename: file.filename });

    try {
      video.status = 'processing';
      await videoRepository.saveVideo(video);

      const uploadResult = await withRetry(
        async (attempt) => {
          video.uploadAttempts = attempt + 1;
          await videoRepository.saveVideo(video);

          return cloudinary.uploader.upload_large(file.path, {
            resource_type: 'video',
            type: 'authenticated',
            public_id: publicId,
            overwrite: true,
            chunk_size: env.cloudinary.uploadChunkSizeMb * 1024 * 1024,
            eager: [
              { format: 'mp4', video_codec: 'h264', audio_codec: 'aac', streaming_profile: 'hd', transformation: [{ quality: 'auto' }] },
              { format: 'jpg', start_offset: '3', width: 640, crop: 'scale', quality: 'auto' },
            ],
            eager_async: false,
            context: {
              course_id: String(courseId),
              lesson_id: payload.lessonId ? String(payload.lessonId) : '',
              uploaded_by: String(user.sub),
            },
          });
        },
        { retries: 2, baseDelayMs: 1000 },
      );

      const thumbnailSignedUrl = this.createSignedThumbnailUrl(uploadResult.public_id);

      video.status = 'ready';
      video.cloudinary = {
        publicId: uploadResult.public_id,
        assetId: uploadResult.asset_id,
        version: uploadResult.version,
        resourceType: uploadResult.resource_type,
        type: uploadResult.type,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        duration: uploadResult.duration,
        width: uploadResult.width,
        height: uploadResult.height,
        playbackUrl: uploadResult.playback_url,
        secureUrl: uploadResult.secure_url,
      };
      video.thumbnail = {
        url: cloudinary.url(uploadResult.public_id, {
          resource_type: 'video',
          type: 'authenticated',
          format: 'jpg',
          transformation: [{ start_offset: '3' }, { width: 640, crop: 'scale', quality: 'auto' }],
          secure: true,
        }),
        signedUrl: thumbnailSignedUrl,
        generatedAt: new Date(),
      };
      video.lastError = undefined;
      await videoRepository.saveVideo(video);

      return video;
    } catch (error) {
      video.status = 'failed';
      video.lastError = error.message;
      await videoRepository.saveVideo(video);
      throw new AppError('Video upload failed. Please retry.', 502, 'VIDEO_UPLOAD_FAILED', { message: error.message });
    } finally {
      await removeFileIfExists(file.path);
    }
  }

  async listCourseVideos(courseId, user) {
    assertObjectId(courseId, 'courseId');
    const course = await courseRepository.findCourseById(courseId);
    if (!course) throw new AppError('Course was not found', 404, 'COURSE_NOT_FOUND');

    if (!canManageCourse(user, course)) {
      const enrollment = user.role === ROLES.STUDENT ? await courseRepository.findEnrollment(user.sub, courseId) : null;
      if (course.status !== 'published' || !enrollment) {
        throw new AppError('You cannot access this course videos', 403, 'FORBIDDEN');
      }
    }

    return videoRepository.listCourseVideos(courseId);
  }

  createSignedStreamingUrl(publicId) {
    this.ensureCloudinaryConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + env.cloudinary.signedUrlTtlSeconds;
    return cloudinary.url(publicId, {
      resource_type: 'video',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
  }

  createSignedThumbnailUrl(publicId) {
    this.ensureCloudinaryConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + env.cloudinary.signedUrlTtlSeconds;
    return cloudinary.url(publicId, {
      resource_type: 'video',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
      format: 'jpg',
      transformation: [{ start_offset: '3' }, { width: 640, crop: 'scale', quality: 'auto' }],
    });
  }

  async getSignedStream(videoId, user) {
    assertObjectId(videoId, 'videoId');
    const video = await videoRepository.findVideoById(videoId);
    if (!video || video.status !== 'ready') {
      throw new AppError('Video was not found', 404, 'VIDEO_NOT_FOUND');
    }

    await this.assertCanAccessVideo(video, user);

    return {
      video,
      streamUrl: this.createSignedStreamingUrl(video.cloudinary.publicId),
      thumbnailUrl: this.createSignedThumbnailUrl(video.cloudinary.publicId),
      expiresInSeconds: env.cloudinary.signedUrlTtlSeconds,
    };
  }

  async retryUpload(videoId, file, user) {
    assertObjectId(videoId, 'videoId');
    const video = await videoRepository.findVideoById(videoId);
    if (!video) throw new AppError('Video was not found', 404, 'VIDEO_NOT_FOUND');

    const course = await courseRepository.findCourseById(video.courseId);
    if (!course || !canManageCourse(user, course)) {
      throw new AppError('You cannot retry this upload', 403, 'FORBIDDEN');
    }

    return this.uploadCourseVideo({
      courseId: String(video.courseId),
      payload: {
        lessonId: video.lessonId,
        title: video.title,
        description: video.description,
      },
      file,
      user,
    });
  }

  async updateProgress(videoId, payload, user) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can track video progress', 403, 'FORBIDDEN');
    }

    assertObjectId(videoId, 'videoId');
    const video = await videoRepository.findVideoById(videoId);
    if (!video || video.status !== 'ready') {
      throw new AppError('Video was not found', 404, 'VIDEO_NOT_FOUND');
    }

    await this.assertCanAccessVideo(video, user);

    return videoRepository.upsertProgress({
      studentId: user.sub,
      courseId: video.courseId,
      videoId,
      watchedSeconds: Math.max(Number(payload.watchedSeconds || 0), 0),
      durationSeconds: Math.max(Number(payload.durationSeconds || video.cloudinary?.duration || 0), 0),
      completed: Boolean(payload.completed),
    });
  }

  async getProgress(videoId, user) {
    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can view video progress', 403, 'FORBIDDEN');
    }

    assertObjectId(videoId, 'videoId');
    const video = await videoRepository.findVideoById(videoId);
    if (!video) throw new AppError('Video was not found', 404, 'VIDEO_NOT_FOUND');
    await this.assertCanAccessVideo(video, user);

    return videoRepository.findProgress(user.sub, videoId);
  }
}
