import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../../..');
const uploadDir = path.resolve(projectRoot, env.upload.tempDir);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
    cb(null, safeName);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!env.upload.allowedVideoMimeTypes.includes(file.mimetype)) {
    return cb(
      new AppError(
        `Unsupported video type. Allowed types: ${env.upload.allowedVideoMimeTypes.join(', ')}`,
        415,
        'UNSUPPORTED_VIDEO_TYPE',
      ),
    );
  }

  return cb(null, true);
};

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: env.upload.maxVideoSizeMb * 1024 * 1024,
  },
});
