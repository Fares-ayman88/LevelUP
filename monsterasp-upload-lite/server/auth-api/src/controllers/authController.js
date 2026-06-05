import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { sanitizeUser } from '../utils/sanitize.js';
import { env } from '../config/env.js';
import { setCsrfCookie } from '../middlewares/csrfProtection.js';

const authService = new AuthService();

const sendSession = (res, statusCode, user, session) => {
  setAuthCookies(res, session);
  res.status(statusCode).json({
    status: 'success',
    data: {
      user: sanitizeUser(user),
      accessToken: session.accessToken,
    },
  });
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { user, session } = await authService.register(req.body, req);
    sendSession(res, 201, user, session);
  }),

  login: asyncHandler(async (req, res) => {
    const { user, session } = await authService.login(req.body, req);
    sendSession(res, 200, user, session);
  }),

  google: asyncHandler(async (req, res) => {
    const { user, session } = await authService.loginWithGoogle(req.body, req);
    sendSession(res, 200, user, session);
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[env.refreshCookieName]);
    clearAuthCookies(res);
    res.status(204).send();
  }),

  refresh: asyncHandler(async (req, res) => {
    const session = await authService.refresh(req.cookies?.[env.refreshCookieName] || req.body.refreshToken, req);
    setAuthCookies(res, session);
    res.status(200).json({
      status: 'success',
      data: { accessToken: session.accessToken },
    });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const user = await authService.verifyEmail(req.body.token);
    res.status(200).json({
      status: 'success',
      data: { user: sanitizeUser(user) },
    });
  }),

  resendVerification: asyncHandler(async (req, res) => {
    await authService.resendVerification(req.body.email);
    res.status(202).json({
      status: 'success',
      message: 'If the email exists, a verification message will be sent.',
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.status(202).json({
      status: 'success',
      message: 'If the email exists, a password reset message will be sent.',
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    clearAuthCookies(res);
    res.status(200).json({
      status: 'success',
      message: 'Password was reset successfully.',
    });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.sub);
    res.status(200).json({
      status: 'success',
      data: { user: sanitizeUser(user) },
    });
  }),

  csrfToken: asyncHandler(async (req, res) => {
    const csrfToken = setCsrfCookie(req, res);
    res.status(200).json({
      status: 'success',
      data: {
        csrfToken,
        headerName: env.csrf.headerName,
      },
    });
  }),
};
