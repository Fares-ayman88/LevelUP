import { getPocketBase, hasPocketBaseEndpoint, initPocketBase } from './pocketbase.js';

const DEFAULT_COLLECTION_NAME = 'email_otp_users';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,8}$/;

export class PocketBaseEmailOtpError extends Error {
  constructor(message, { configurationIssue = false, code = '' } = {}) {
    super(message);
    this.name = 'PocketBaseEmailOtpError';
    this.configurationIssue = configurationIssue;
    this.code = code;
  }
}

function normalizeEmail(value = '') {
  return value.toString().trim().toLowerCase();
}

function normalizeCode(value = '') {
  return value.toString().trim();
}

function extractErrorMessage(error) {
  return (
    error?.response?.message ||
    error?.data?.message ||
    error?.message ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();
}

function extractErrorData(error) {
  const data = error?.response?.data;
  return data && typeof data === 'object' ? data : {};
}

function isDuplicateEmailError(error) {
  const data = extractErrorData(error);
  const emailField = data.email;
  if (!emailField || typeof emailField !== 'object') return false;
  const code = (emailField.code || '').toString().trim().toLowerCase();
  const message = (emailField.message || '').toString().trim().toLowerCase();
  return code === 'validation_not_unique' || message.includes('already');
}

function isMissingCollection(error) {
  const message = extractErrorMessage(error);
  return error?.status === 404 && (
    message.includes('missing') ||
    message.includes('collection') ||
    message.includes('not found')
  );
}

function mapCreateError(error) {
  const message = extractErrorMessage(error);
  if (isMissingCollection(error)) {
    return new PocketBaseEmailOtpError(
      'PocketBase OTP is not ready yet. Create the "email_otp_users" auth collection first.',
      { configurationIssue: true, code: 'pb/missing-collection' }
    );
  }
  if (error?.status === 403) {
    return new PocketBaseEmailOtpError(
      'PocketBase OTP user creation is blocked. Allow create access for "email_otp_users" or handle it with a PocketBase hook.',
      { configurationIssue: true, code: 'pb/create-blocked' }
    );
  }
  if (message.includes('smtp') || message.includes('mail')) {
    return new PocketBaseEmailOtpError(
      'Configure PocketBase SMTP mail settings before sending verification codes.',
      { configurationIssue: true, code: 'pb/missing-smtp' }
    );
  }
  return new PocketBaseEmailOtpError('Could not prepare email verification. Try again.', {
    code: 'pb/create-failed',
  });
}

function mapRequestError(error) {
  const message = extractErrorMessage(error);
  if (isMissingCollection(error)) {
    return new PocketBaseEmailOtpError(
      'PocketBase OTP is not ready yet. Create the "email_otp_users" auth collection first.',
      { configurationIssue: true, code: 'pb/missing-collection' }
    );
  }
  if (message.includes('otp') && message.includes('enable')) {
    return new PocketBaseEmailOtpError(
      'Enable OTP auth for the "email_otp_users" collection in PocketBase.',
      { configurationIssue: true, code: 'pb/otp-disabled' }
    );
  }
  if (message.includes('smtp') || message.includes('mail')) {
    return new PocketBaseEmailOtpError(
      'PocketBase mail sending is not ready. Configure SMTP first.',
      { configurationIssue: true, code: 'pb/missing-smtp' }
    );
  }
  if (error?.status === 429 || message.includes('too many')) {
    return new PocketBaseEmailOtpError(
      'Too many verification requests. Wait a little, then try again.',
      { code: 'pb/rate-limited' }
    );
  }
  return new PocketBaseEmailOtpError('Could not send the verification code. Try again.', {
    code: 'pb/request-failed',
  });
}

function mapVerifyError(error) {
  const message = extractErrorMessage(error);
  if (
    message.includes('invalid') ||
    message.includes('expired') ||
    message.includes('otp')
  ) {
    return new PocketBaseEmailOtpError(
      'The code is invalid or expired. Request a new one and try again.',
      { code: 'pb/invalid-otp' }
    );
  }
  if (error?.status === 429 || message.includes('too many')) {
    return new PocketBaseEmailOtpError(
      'Too many verification attempts. Wait a little, then try again.',
      { code: 'pb/rate-limited' }
    );
  }
  return new PocketBaseEmailOtpError('Could not verify the code. Try again.', {
    code: 'pb/verify-failed',
  });
}

function randomPassword() {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  const bytes = crypto.getRandomValues(new Uint32Array(20));
  return Array.from(bytes, (value) => chars[value % chars.length]).join('');
}

async function getClient() {
  const initialized = await initPocketBase().catch(() => null);
  const client = initialized || getPocketBase();
  if (!client || !hasPocketBaseEndpoint()) {
    throw new PocketBaseEmailOtpError(
      'PocketBase is not configured or reachable right now. Check the PocketBase server and endpoint.',
      { configurationIssue: true, code: 'pb/unreachable' }
    );
  }
  return client;
}

async function requestOtp(recordService, client, collectionName, email) {
  if (typeof recordService?.requestOTP === 'function') {
    return recordService.requestOTP(email);
  }

  return client.send(`/api/collections/${encodeURIComponent(collectionName)}/request-otp`, {
    method: 'POST',
    body: { email },
  });
}

async function authWithOtp(recordService, client, collectionName, otpId, code) {
  if (typeof recordService?.authWithOTP === 'function') {
    return recordService.authWithOTP(otpId, code);
  }

  return client.send(`/api/collections/${encodeURIComponent(collectionName)}/auth-with-otp`, {
    method: 'POST',
    body: {
      otpId,
      password: code,
    },
  });
}

async function ensureOtpRecord(client, collectionName, email) {
  const recordService = client.collection(collectionName);
  const password = randomPassword();

  try {
    await recordService.create({
      email,
      password,
      passwordConfirm: password,
      emailVisibility: true,
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) return;
    throw mapCreateError(error);
  }
}

export async function requestEmailOtpCode(email, { collectionName = DEFAULT_COLLECTION_NAME } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new PocketBaseEmailOtpError('Enter a valid email address first.', {
      code: 'pb/invalid-email',
    });
  }

  const client = await getClient();
  const recordService = client.collection(collectionName);

  await ensureOtpRecord(client, collectionName, normalizedEmail);

  try {
    const response = await requestOtp(recordService, client, collectionName, normalizedEmail);
    const otpId = (response?.otpId || '').toString().trim();
    if (!otpId) {
      throw new PocketBaseEmailOtpError('The verification code request did not return an id.', {
        code: 'pb/missing-otp-id',
      });
    }
    return {
      email: normalizedEmail,
      otpId,
    };
  } catch (error) {
    if (error instanceof PocketBaseEmailOtpError) {
      throw error;
    }
    throw mapRequestError(error);
  }
}

export async function verifyEmailOtpCode(
  { otpId, code, collectionName = DEFAULT_COLLECTION_NAME } = {}
) {
  const normalizedOtpId = (otpId || '').toString().trim();
  const normalizedCode = normalizeCode(code);

  if (!normalizedOtpId) {
    throw new PocketBaseEmailOtpError('Request a new verification code first.', {
      code: 'pb/missing-otp-id',
    });
  }
  if (!OTP_PATTERN.test(normalizedCode)) {
    throw new PocketBaseEmailOtpError('Enter the 6 to 8 digit verification code.', {
      code: 'pb/invalid-code-format',
    });
  }

  const client = await getClient();
  const recordService = client.collection(collectionName);

  try {
    const response = await authWithOtp(
      recordService,
      client,
      collectionName,
      normalizedOtpId,
      normalizedCode
    );
    client.authStore.clear();
    return response;
  } catch (error) {
    client.authStore.clear();
    if (error instanceof PocketBaseEmailOtpError) {
      throw error;
    }
    throw mapVerifyError(error);
  }
}
