import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { AppError } from '../errors/AppError.js';

export function configureCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new AppError('Cloudinary environment variables are not configured', 500, 'CLOUDINARY_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export { cloudinary };
