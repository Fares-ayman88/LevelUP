import fs from 'fs/promises';
import { logger } from './logger.js';

export async function removeFileIfExists(path) {
  if (!path) return;

  try {
    await fs.unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('Failed to remove temporary upload file', { path, message: error.message });
    }
  }
}
