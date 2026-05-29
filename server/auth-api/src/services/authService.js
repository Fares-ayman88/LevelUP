import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { UserRepository } from '../repositories/userRepository.js';
import { TokenService } from './tokenService.js';
import { EmailService } from './emailService.js';
import { ROLES } from '../constants/roles.js';
import { createPlainToken, hashToken } from '../utils/crypto.js';
import { env } from '../config/env.js';

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

export class AuthService {
  async register(payload, req) {
    const existingUser = await userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const verificationToken = createPlainToken();
    const user = await userRepository.create({
      name: payload.name,
      email: payload.email,
      role: payload.role || ROLES.STUDENT,
      passwordHash: 'pending',
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + env.emailVerificationTtlHours * 60 * 60 * 1000),
    });

    await user.setPassword(payload.password);
    await userRepository.save(user);
    await emailService.sendVerificationEmail(user, verificationToken);

    const session = await issueSession(user, req);
    return { user, session };
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

    const session = await issueSession(user, req);
    return { user, session };
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
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      return;
    }
    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }

    const verificationToken = createPlainToken();
    user.emailVerificationTokenHash = hashToken(verificationToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + env.emailVerificationTtlHours * 60 * 60 * 1000);
    await userRepository.save(user);
    await emailService.sendVerificationEmail(user, verificationToken);
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
