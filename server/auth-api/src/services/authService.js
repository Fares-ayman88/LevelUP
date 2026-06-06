import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { UserRepository } from '../repositories/userRepository.js';
import { TokenService } from './tokenService.js';
import { EmailService } from './emailService.js';
import { ROLES } from '../constants/roles.js';
import { createPlainToken, hashToken } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { compareOTP, generateOTP, hashOTP } from '../utils/otp.js';

const userRepository = new UserRepository();
const tokenService = new TokenService();
const emailService = new EmailService();

const getMetadata = (req) => ({
  userAgent: req.get('user-agent'),
  ipAddress: req.ip,
});

const issueSession = async (user, req) => {
  const accessToken = tokenService.signAccessToken(user);
  const refresh = tokenService.signRefreshToken(user, getMetadata(req));

  user.refreshTokens.push(refresh.tokenRecord);
  user.lastLoginAt = new Date();
  await userRepository.save(user);

  return {
    accessToken,
    refreshToken: refresh.plainToken,
    refreshExpiresAt: refresh.tokenRecord.expiresAt,
  };
};

const isVerifiedUser = (user) => user.isVerified === true || user.isEmailVerified === true;

const assignVerificationOtp = async (user) => {
  const otp = generateOTP();
  user.otpHash = await hashOTP(otp);
  user.otpExpiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);
  user.otpLastSentAt = new Date();
  user.otpAttempts = 0;
  return otp;
};

const clearVerificationOtp = (user) => {
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpLastSentAt = undefined;
  user.otpAttempts = 0;
};

export class AuthService {
  async register(payload, req) {
    const existingUser = await userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const user = await userRepository.create({
      name: payload.name,
      email: payload.email,
      role: payload.role || ROLES.STUDENT,
      passwordHash: 'pending',
      isVerified: false,
      isEmailVerified: false,
    });

    await user.setPassword(payload.password);
    const otp = await assignVerificationOtp(user);
    await userRepository.save(user);
    await emailService.sendVerificationEmail(user.email, otp);

    return { user, pendingVerification: true };
  }

  async login(payload, req) {
    const user = await userRepository.findByEmail(payload.email, true);
    if (!user || user.status !== 'active') {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const passwordMatches = await user.comparePassword(payload.password);
    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!isVerifiedUser(user)) {
      throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED');
    }

    const session = await issueSession(user, req);
    return { user, session };
  }

  async verifyOtp(payload, req) {
    const email = String(payload.email || '').trim().toLowerCase();
    const otp = String(payload.otp || payload.code || '').trim();
    const user = await userRepository.findByEmail(email, true);

    if (!user || user.status !== 'active') {
      throw new AppError('User was not found', 404, 'USER_NOT_FOUND');
    }
    if (isVerifiedUser(user)) {
      throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }
    if ((user.otpAttempts || 0) >= env.otpMaxAttempts) {
      throw new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 429, 'OTP_ATTEMPTS_EXCEEDED');
    }
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
      throw new AppError('OTP has expired. Please request a new OTP.', 400, 'OTP_EXPIRED');
    }

    const valid = await compareOTP(otp, user.otpHash);
    if (!valid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await userRepository.save(user);
      if (user.otpAttempts >= env.otpMaxAttempts) {
        throw new AppError('Maximum verification attempts exceeded. Please request a new OTP.', 429, 'OTP_ATTEMPTS_EXCEEDED');
      }
      throw new AppError('Invalid OTP code', 400, 'INVALID_OTP');
    }

    user.isVerified = true;
    user.isEmailVerified = true;
    clearVerificationOtp(user);
    await userRepository.save(user);

    const session = await issueSession(user, req);
    return { user, session };
  }

  async resendOtp(email) {
    const user = await userRepository.findByEmail(email, true);
    if (!user || user.status !== 'active') {
      return { email };
    }
    if (isVerifiedUser(user)) {
      throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    const lastSentAt = user.otpLastSentAt ? new Date(user.otpLastSentAt).getTime() : 0;
    const waitMs = env.otpResendCooldownSeconds * 1000 - (Date.now() - lastSentAt);
    if (waitMs > 0) {
      throw new AppError('Please wait before requesting another OTP.', 429, 'OTP_RESEND_COOLDOWN', {
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      });
    }

    const otp = await assignVerificationOtp(user);
    await userRepository.save(user);
    await emailService.sendVerificationEmail(user.email, otp);
    return { email: user.email };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    const tokenHash = tokenService.hash(refreshToken);
    const user = await userRepository.findByRefreshHash(tokenHash);
    if (!user) return;

    const record = user.refreshTokens.find((item) => item.tokenHash === tokenHash);
    if (record && !record.revokedAt) {
      record.revokedAt = new Date();
      await userRepository.save(user);
    }
  }

  async refresh(refreshToken, req) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = tokenService.hash(refreshToken);
    const user = await userRepository.findByRefreshHash(tokenHash);
    if (!user || user.status !== 'active') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const currentToken = user.refreshTokens.find((item) => item.tokenHash === tokenHash);
    if (!currentToken || currentToken.revokedAt || currentToken.expiresAt <= new Date()) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    currentToken.revokedAt = new Date();
    const nextRefresh = tokenService.signRefreshToken(user, getMetadata(req));
    currentToken.replacedByTokenHash = nextRefresh.tokenRecord.tokenHash;
    user.refreshTokens.push(nextRefresh.tokenRecord);

    const activeTokens = user.refreshTokens
      .filter((item) => !item.revokedAt && item.expiresAt > new Date())
      .slice(-10);
    user.refreshTokens = activeTokens;

    await userRepository.save(user);

    return {
      accessToken: tokenService.signAccessToken(user),
      refreshToken: nextRefresh.plainToken,
      refreshExpiresAt: nextRefresh.tokenRecord.expiresAt,
    };
  }

  async verifyEmail(token) {
    const user = await userRepository.findByVerificationHash(hashToken(token));
    if (!user) {
      throw new AppError('Verification token is invalid or expired', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await userRepository.save(user);
    return user;
  }

  async resendVerification(email) {
    return this.resendOtp(email);
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email, true);
    if (!user || user.status !== 'active') {
      return;
    }

    const resetToken = createPlainToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + env.passwordResetTtlMinutes * 60 * 1000);
    await userRepository.save(user);
    await emailService.sendPasswordResetEmail(user, resetToken);
  }

  async resetPassword(token, password) {
    const user = await userRepository.findByPasswordResetHash(hashToken(token));
    if (!user) {
      throw new AppError('Password reset token is invalid or expired', 400, 'INVALID_RESET_TOKEN');
    }

    await user.setPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokens = [];
    await userRepository.save(user);
  }

  async getCurrentUser(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new AppError('Invalid user id', 400, 'INVALID_USER_ID');
    }

    const user = await userRepository.findById(userId);
    if (!user || user.status !== 'active') {
      throw new AppError('User was not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  }
}
