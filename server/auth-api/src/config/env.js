import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
dotenv.config();

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const clientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 8090),
  mongoUri: process.env.MONGODB_URI,
  clientUrl: clientUrls[0],
  clientUrls,
  apiVersion: process.env.API_VERSION || 'v1',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TTL || '30d',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'levelup_refresh',
  accessCookieName: process.env.ACCESS_COOKIE_NAME || 'levelup_access',
  passwordResetTtlMinutes: toNumber(process.env.PASSWORD_RESET_TTL_MINUTES, 15),
  emailVerificationTtlHours: toNumber(process.env.EMAIL_VERIFICATION_TTL_HOURS, 24),
  otpExpiresMinutes: toNumber(process.env.OTP_EXPIRES_MINUTES, 10),
  otpResendCooldownSeconds: toNumber(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
  otpMaxAttempts: toNumber(process.env.OTP_MAX_ATTEMPTS, 5),
  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 12),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  uploadRateLimitWindowMs: toNumber(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  uploadRateLimitMax: toNumber(process.env.UPLOAD_RATE_LIMIT_MAX, 10),
  csrf: {
    enabled: toBoolean(process.env.CSRF_ENABLED, (process.env.NODE_ENV || 'development') === 'production'),
    cookieName: process.env.CSRF_COOKIE_NAME || 'levelup_csrf',
    headerName: (process.env.CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase(),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'LevelUp <no-reply@levelup.local>',
    adminEmail: process.env.LEVELUP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_TO || process.env.EMAIL_USER || process.env.SMTP_USER,
  },
  upload: {
    tempDir: process.env.UPLOAD_TEMP_DIR || 'tmp/uploads',
    maxVideoSizeMb: toNumber(process.env.MAX_VIDEO_SIZE_MB, 1024),
    allowedVideoMimeTypes: (process.env.ALLOWED_VIDEO_MIME_TYPES || 'video/mp4,video/webm,video/quicktime')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_VIDEO_FOLDER || 'levelup/videos',
    signedUrlTtlSeconds: toNumber(process.env.CLOUDINARY_SIGNED_URL_TTL_SECONDS, 15 * 60),
    uploadChunkSizeMb: toNumber(process.env.CLOUDINARY_UPLOAD_CHUNK_SIZE_MB, 20),
  },
};

export const isProduction = env.nodeEnv === 'production';
