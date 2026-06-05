import { VideoAsset } from '../models/VideoAsset.js';
import { VideoProgress } from '../models/VideoProgress.js';

export class VideoRepository {
  createVideo(data) {
    return VideoAsset.create(data);
  }

  findVideoById(videoId) {
    return VideoAsset.findOne({ _id: videoId, deletedAt: null });
  }

  async listCourseVideos(courseId) {
    return VideoAsset.find({ courseId, deletedAt: null })
      .sort({ createdAt: 1 })
      .select('-cloudinary.secureUrl')
      .lean({ virtuals: true });
  }

  saveVideo(video) {
    return video.save();
  }

  async upsertProgress({ studentId, courseId, videoId, watchedSeconds, durationSeconds, completed }) {
    const progressPercent = durationSeconds > 0 ? Math.min(Math.round((watchedSeconds / durationSeconds) * 100), 100) : 0;
    const isCompleted = completed || progressPercent >= 90;

    return VideoProgress.findOneAndUpdate(
      { studentId, videoId, deletedAt: null },
      {
        $set: {
          courseId,
          watchedSeconds,
          durationSeconds,
          progressPercent,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : undefined,
          lastWatchedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  findProgress(studentId, videoId) {
    return VideoProgress.findOne({ studentId, videoId, deletedAt: null });
  }
}
