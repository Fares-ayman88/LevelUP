export function sanitizeUser(user) {
  if (!user) return null;
  const source = typeof user.toObject === 'function' ? user.toObject() : user;
  delete source.passwordHash;
  delete source.emailVerificationTokenHash;
  delete source.passwordResetTokenHash;
  delete source.refreshTokens;
  delete source.__v;
  return source;
}
