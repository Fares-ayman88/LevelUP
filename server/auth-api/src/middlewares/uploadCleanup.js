import { removeFileIfExists } from '../utils/fileCleanup.js';

export async function uploadCleanupOnError(error, req, _res, next) {
  if (req.file?.path) {
    await removeFileIfExists(req.file.path);
  }
  next(error);
}
