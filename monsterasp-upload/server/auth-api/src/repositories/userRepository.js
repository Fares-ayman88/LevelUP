import { User } from '../models/User.js';

export class UserRepository {
  create(data) {
    return User.create(data);
  }

  findById(id, projection) {
    return User.findOne({ _id: id, deletedAt: null }, projection);
  }

  findByEmail(email, includeSecrets = false) {
    let query = User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (includeSecrets) {
      query = query.select(
        '+passwordHash +refreshTokens +emailVerificationTokenHash +passwordResetTokenHash +emailVerificationExpiresAt +passwordResetExpiresAt',
      );
    }
    return query;
  }

  findByVerificationHash(tokenHash) {
    return User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
      deletedAt: null,
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  }

  findByPasswordResetHash(tokenHash) {
    return User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      deletedAt: null,
    }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +refreshTokens');
  }

  findByRefreshHash(tokenHash) {
    return User.findOne({
      'refreshTokens.tokenHash': tokenHash,
      deletedAt: null,
    }).select('+refreshTokens');
  }

  save(user) {
    return user.save();
  }
}
