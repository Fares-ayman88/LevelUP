import { Router } from 'express';
import { authController } from '../../controllers/authController.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authRateLimiter, passwordResetRateLimiter } from '../../middlewares/rateLimiters.js';
import { validate } from '../../middlewares/validate.js';
import {
  emailValidator,
  loginValidator,
  otpValidator,
  registerValidator,
  resetPasswordValidator,
  tokenValidator,
} from '../../validators/authValidators.js';

export const authRoutes = Router();

authRoutes.get('/csrf-token', authController.csrfToken);
authRoutes.post('/register', authRateLimiter, registerValidator, validate, authController.register);
authRoutes.post('/login', authRateLimiter, loginValidator, validate, authController.login);
authRoutes.post('/verify-otp', authRateLimiter, otpValidator, validate, authController.verifyOtp);
authRoutes.post('/resend-otp', authRateLimiter, emailValidator, validate, authController.resendOtp);
authRoutes.post('/logout', authController.logout);
authRoutes.post('/refresh-token', authController.refresh);
authRoutes.post('/verify-email', tokenValidator, validate, authController.verifyEmail);
authRoutes.post('/resend-verification', authRateLimiter, emailValidator, validate, authController.resendVerification);
authRoutes.post('/forgot-password', passwordResetRateLimiter, emailValidator, validate, authController.forgotPassword);
authRoutes.post('/reset-password', passwordResetRateLimiter, resetPasswordValidator, validate, authController.resetPassword);
authRoutes.get('/me', authenticate, authController.me);
