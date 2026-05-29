import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createPlainToken, hashToken } from '../utils/crypto.js';

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

export class TokenService {
  signAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      env.accessTokenSecret,
      {
        expiresIn: env.accessTokenTtl,
        issuer: 'levelup-auth-api',
        audience: 'levelup-client',
      },
    );
  }

  verifyAccessToken(token) {
    return jwt.verify(token, env.accessTokenSecret, {
      issuer: 'levelup-auth-api',
      audience: 'levelup-client',
    });
  }

  signRefreshToken(user, metadata = {}) {
    const plainToken = createPlainToken(48);
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + daysToMs(30));

    return {
      plainToken,
      tokenRecord: {
        tokenHash,
        expiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    };
  }

  hash(token) {
    return hashToken(token);
  }
}
