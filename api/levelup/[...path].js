import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import path from 'node:path';

const DEFAULT_GOOGLE_CLIENT_ID = '713417674505-2653e24s70ode9kc97661ojp0gjl168s.apps.googleusercontent.com';
const DEFAULT_ADMINS = {
  sa3doon: 'sa3doon123',
  fares: 'fares123',
  mahmoud: 'mahmoud123',
};
const MONSTERASP_API_BASE_URL = (
  process.env.LEVELUP_BACKEND_URL ||
  'http://fares-levelup-api.runasp.net/api/v1'
).replace(/\/+$/, '');
const MONSTERASP_PROXY_ROOTS = new Set([
  'health',
  'ready',
  'auth',
  'courses',
  'enrollments',
  'videos',
  'quizzes',
  'quiz-attempts',
]);
const LOCAL_FALLBACK_ROOTS = new Set([
  'notifications',
  'mentors',
  'chats',
  'transactions',
]);

let sqlClient = null;
let readyPromise = null;

const fallbackState = globalThis.__LEVELUP_FALLBACK_STATE__ || {
  instructorRequests: [],
};
globalThis.__LEVELUP_FALLBACK_STATE__ = fallbackState;

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) {
    throw new Error('DATABASE_URL is not configured. Add a Neon/Postgres database to Vercel.');
  }
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = '') {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '')}`;
}

function getOtpConfig() {
  return {
    expiresMinutes: Number.parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10),
    resendCooldownSeconds: Number.parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
    maxAttempts: Number.parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  };
}

function shouldEnforceEmailVerification() {
  return String(process.env.LEVELUP_ENFORCE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';
}

function getOtpEmailProvider() {
  const provider = String(process.env.LEVELUP_OTP_EMAIL_PROVIDER || 'auto').trim().toLowerCase();
  if (provider === 'smtp' || provider === 'resend') return provider;
  return 'auto';
}

function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOTP(otp, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.pbkdf2Sync(String(otp), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}$${digest}`;
}

function compareOTP(otp, stored = '') {
  const [salt, expected] = String(stored).split('$');
  if (!salt || !expected) return false;
  const candidate = hashOTP(otp, salt).split('$')[1];
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function makeGuestInstructorUserId(email) {
  const digest = crypto.createHash('sha256').update(String(email || '').toLowerCase()).digest('hex');
  return `guest_${digest.slice(0, 20)}`;
}

function getAdminEmail() {
  return (
    process.env.LEVELUP_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_TO ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    ''
  ).trim();
}

function getResendFrom() {
  return (process.env.RESEND_FROM || process.env.EMAIL_FROM || 'LevelUP <onboarding@resend.dev>').trim();
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && getAdminEmail());
}

function hasSmtpConfig() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  return Boolean(process.env.SMTP_HOST && user && pass && getAdminEmail());
}

function hasSmtpAuthConfig() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  return Boolean(process.env.SMTP_HOST && user && pass);
}

function hasVerificationEmailConfig() {
  return Boolean(hasSmtpAuthConfig() || process.env.RESEND_API_KEY);
}

function maskEmail(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/<([^>]+)>/);
  const email = (match?.[1] || raw).trim();
  const [name, domain = ''] = email.split('@');

  if (!domain) {
    return raw.length <= 4 ? '****' : `${raw.slice(0, 2)}****${raw.slice(-2)}`;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function getSmtpConfigStatus() {
  const port = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || (smtpUser ? `LevelUp <${smtpUser}>` : '');

  return {
    configured: hasResendConfig() || hasSmtpConfig(),
    provider: hasResendConfig() ? 'resend' : 'smtp',
    otpProvider: getOtpEmailProvider(),
    resend: {
      configured: hasResendConfig(),
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      apiKeyLength: process.env.RESEND_API_KEY ? String(process.env.RESEND_API_KEY).length : 0,
      from: maskEmail(getResendFrom()),
    },
    smtp: {
      configured: hasSmtpConfig(),
      host: process.env.SMTP_HOST || '',
      port,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
      hasUser: Boolean(smtpUser),
      user: maskEmail(smtpUser),
      hasPass: Boolean(smtpPass),
      passLength: smtpPass ? String(smtpPass).length : 0,
      hasFrom: Boolean(process.env.EMAIL_FROM || process.env.SMTP_FROM),
      from: maskEmail(from),
    },
    host: process.env.SMTP_HOST || '',
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    hasUser: Boolean(smtpUser),
    user: maskEmail(smtpUser),
    hasPass: Boolean(smtpPass),
    passLength: smtpPass ? String(smtpPass).length : 0,
    hasAdminEmail: Boolean(getAdminEmail()),
    adminEmail: maskEmail(getAdminEmail()),
    hasFrom: Boolean(process.env.EMAIL_FROM || process.env.SMTP_FROM),
    from: maskEmail(from),
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInstructorRequestEmail(item = {}) {
  const rows = [
    ['Name', item.name],
    ['Email', item.email],
    ['Phone', item.phone],
    ['Category', item.category],
    ['Courses Taken', item.coursesTaken],
    ['Experience Years', item.experienceYears],
    ['Notes', item.notes],
    ['Request ID', item.id],
    ['Status', item.status],
  ];
  const text = rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
  const htmlRows = rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim())
    .map(([label, value]) => `<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`)
    .join('');
  return {
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#111827;"><h2>New instructor application</h2><table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;max-width:720px;">${htmlRows}</table></div>`,
  };
}

function createSmtpTransporter() {
  const port = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendInstructorRequestEmail(item) {
  if (hasResendConfig()) {
    return sendInstructorRequestEmailWithResend(item);
  }

  const transporter = createSmtpTransporter();
  const content = buildInstructorRequestEmail(item);

  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `LevelUp <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: getAdminEmail(),
    replyTo: item.email || undefined,
    subject: `New instructor application: ${item.name || item.email || 'Candidate'}`,
    text: content.text,
    html: content.html,
  });
}

async function sendInstructorRequestEmailWithResend(item) {
  const content = buildInstructorRequestEmail(item);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getResendFrom(),
      to: [getAdminEmail()],
      reply_to: item.email || undefined,
      subject: `New instructor application: ${item.name || item.email || 'Candidate'}`,
      text: content.text,
      html: content.html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Resend email failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function buildVerificationEmailContent(otp) {
  const config = getOtpConfig();
  return {
    subject: 'Your LevelUp verification code',
    text: `Welcome to LevelUp.\n\nYour email verification code is: ${otp}\n\nThis code expires in ${config.expiresMinutes} minutes. Do not share it with anyone.`,
    html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;"><h2>Verify your LevelUp email</h2><p>Your verification code is:</p><div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:16px 20px;background:#f3f6ff;border-radius:12px;display:inline-block;">${escapeHtml(otp)}</div><p>This code expires in ${config.expiresMinutes} minutes.</p></div>`,
  };
}

async function sendVerificationEmailWithSmtp(email, content) {
  if (!hasSmtpAuthConfig()) {
    throw new Error('SMTP verification email is not configured.');
  }

  const transporter = createSmtpTransporter();
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `LevelUp <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

async function sendVerificationEmailWithResend(email, content) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend verification email is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getResendFrom(),
      to: [email],
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Resend email failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function sendVerificationEmail(email, otp) {
  const content = buildVerificationEmailContent(otp);
  const provider = getOtpEmailProvider();

  if (provider === 'smtp') {
    return sendVerificationEmailWithSmtp(email, content);
  }

  if (provider === 'resend') {
    return sendVerificationEmailWithResend(email, content);
  }

  const errors = [];
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendVerificationEmailWithResend(email, content);
    } catch (error) {
      errors.push(`Resend: ${error?.message || 'failed'}`);
    }
  }
  if (hasSmtpAuthConfig()) {
    try {
      return await sendVerificationEmailWithSmtp(email, content);
    } catch (error) {
      errors.push(`SMTP: ${error?.message || 'failed'}`);
    }
  }
  if (errors.length) throw new Error(errors.join(' | '));

  throw new Error('Verification email is not configured.');
}

async function notifyVerificationOtp(email, otp) {
  if (!hasVerificationEmailConfig()) {
    console.warn('Verification OTP email skipped: outbound email is not configured.', { email });
    return { ok: false, error: 'Verification email is not configured.' };
  }
  try {
    const info = await sendVerificationEmail(email, otp);
    return { ok: true, info };
  } catch (error) {
    console.warn('Verification OTP email failed:', error?.message || error);
    return { ok: false, error: error?.message || 'Verification email failed.' };
  }
}

async function notifyInstructorRequest(item) {
  if (!hasResendConfig() && !hasSmtpConfig()) {
    console.warn('Instructor request email skipped: Resend/SMTP is not configured.');
    return;
  }
  try {
    await sendInstructorRequestEmail(item);
  } catch (error) {
    console.warn('Instructor request email failed:', error?.message || error);
  }
}

function send(res, status, data) {
  res.status(status).json(data);
}

function bad(res, message, status = 400, code = '') {
  send(res, status, { error: message, ...(code ? { code } : {}) });
}

async function handleDebug(req, res, parts, query) {
  if (req.method !== 'GET') return bad(res, 'Method not allowed.', 405);

  if (parts[1] === 'smtp') {
    return send(res, 200, getSmtpConfigStatus());
  }

  if (parts[1] === 'storage') {
    let postgresReady = false;
    let instructorRequestCount = fallbackState.instructorRequests.length;
    if (hasVercelDatabase()) {
      try {
        await initDb();
        const sql = getSql();
        const rows = await sql`select count(*)::int as count from instructor_requests`;
        instructorRequestCount = rows[0]?.count ?? 0;
        postgresReady = true;
      } catch {
        postgresReady = false;
      }
    }
    return send(res, 200, {
      databaseConfigured: hasVercelDatabase(),
      postgresReady,
      storage: postgresReady ? 'postgres' : 'memory-fallback',
      instructorRequestCount,
      fallbackCount: fallbackState.instructorRequests.length,
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    });
  }

  if (parts[1] === 'smtp-test') {
    const expected = process.env.LEVELUP_EMAIL_TEST_SECRET || '';
    const provided = String(query.secret || req.headers['x-levelup-test-secret'] || '');

    if (!expected) return bad(res, 'LEVELUP_EMAIL_TEST_SECRET is not configured.', 503);
    if (!provided || provided !== expected) return bad(res, 'Invalid email test secret.', 403);

    if (!hasSmtpConfig()) {
      return send(res, 503, {
        ok: false,
        error: 'SMTP is not fully configured.',
        smtp: getSmtpConfigStatus(),
      });
    }

    try {
      const transporter = createSmtpTransporter();
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `LevelUp <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to: getAdminEmail(),
        subject: 'LevelUp forced SMTP test',
        text: 'This is a LevelUp forced SMTP test email.',
        html: '<div style="font-family:Arial,sans-serif;color:#111827;"><h2>LevelUp forced SMTP test</h2><p>This email was sent using SMTP only.</p></div>',
      });

      return send(res, 200, {
        ok: true,
        provider: 'smtp',
        result: {
          messageId: info.messageId,
          accepted: info.accepted || [],
          rejected: info.rejected || [],
          response: info.response || '',
        },
      });
    } catch (error) {
      return send(res, 500, {
        ok: false,
        error: error?.message || 'Email test failed.',
        code: error?.code || null,
        command: error?.command || null,
        response: error?.response || null,
        smtp: getSmtpConfigStatus(),
      });
    }
  }

  if (parts[1] === 'otp-test') {
    const expected = process.env.LEVELUP_EMAIL_TEST_SECRET || '';
    const provided = String(query.secret || req.headers['x-levelup-test-secret'] || '');
    const email = String(query.email || getAdminEmail() || '').trim().toLowerCase();

    if (!expected) return bad(res, 'LEVELUP_EMAIL_TEST_SECRET is not configured.', 503);
    if (!provided || provided !== expected) return bad(res, 'Invalid email test secret.', 403);
    if (!email.includes('@')) return bad(res, 'Valid email is required.');

    try {
      const info = await sendVerificationEmail(email, '123456');
      return send(res, 200, {
        ok: true,
        email: maskEmail(email),
        result: {
          messageId: info?.messageId || null,
          accepted: info?.accepted || [],
          rejected: info?.rejected || [],
          response: info?.response || '',
        },
      });
    } catch (error) {
      return send(res, 500, {
        ok: false,
        error: error?.message || 'OTP email test failed.',
        code: error?.code || null,
        command: error?.command || null,
        response: error?.response || null,
        smtp: getSmtpConfigStatus(),
      });
    }
  }

  return bad(res, 'Not found.', 404);
}

function hasVercelDatabase() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

async function sendNoDatabaseFallback(req, res, parts) {
  const root = parts[0] || '';
  if (root === 'notifications') {
    if (req.method === 'GET') return send(res, 200, { items: [] });
    if (req.method === 'PATCH') return send(res, 200, { item: { id: parts[1], isRead: true } });
    if (req.method === 'DELETE') return send(res, 200, { ok: true });
  }
  if (root === 'mentors') {
    if (req.method === 'GET') return send(res, 200, { items: [] });
  }
  if (root === 'instructor-requests') {
    if (req.method === 'GET' && parts[1] === 'stats') {
      return send(res, 200, instructorRequestStats(fallbackState.instructorRequests));
    }
    if (req.method === 'GET') {
      const status = new URL(req.url || '/api/levelup', `https://${req.headers.host || 'localhost'}`).searchParams.get('status');
      const items = status
        ? fallbackState.instructorRequests.filter((item) => item.status === status)
        : fallbackState.instructorRequests;
      return send(res, 200, { items });
    }
    if (req.method === 'POST') {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const userId = String(req.body?.userId || '').trim() || makeGuestInstructorUserId(email);
      const existingIndex = fallbackState.instructorRequests.findIndex((item) => item.userId === userId);
      const item = {
        id: existingIndex >= 0 ? fallbackState.instructorRequests[existingIndex].id : makeId('irq_'),
        ...(req.body || {}),
        userId,
        email,
        status: 'pending',
        requestedAt: existingIndex >= 0 ? fallbackState.instructorRequests[existingIndex].requestedAt : nowIso(),
        updatedAt: nowIso(),
        storage: 'memory-fallback',
      };
      if (existingIndex >= 0) fallbackState.instructorRequests[existingIndex] = item;
      else fallbackState.instructorRequests.unshift(item);
      await notifyInstructorRequest(item);
      return send(res, existingIndex >= 0 ? 200 : 201, { item });
    }
    if (req.method === 'PATCH' && parts[1] && parts[2] === 'status') {
      const status = String(req.body?.status || 'pending').trim();
      const item = fallbackState.instructorRequests.find((request) => request.id === parts[1]);
      if (!item) return bad(res, 'Not found.', 404);
      item.status = status;
      item.updatedAt = nowIso();
      item.resolvedAt = status === 'pending' ? null : nowIso();
      return send(res, 200, { item });
    }
  }
  if (root === 'chats' || root === 'transactions') {
    if (req.method === 'GET') return send(res, 200, { items: [] });
    if (req.method === 'POST') return send(res, 201, { item: { id: makeId(`${root.slice(0, 3)}_`), ...(req.body || {}) } });
    if (req.method === 'PATCH') return send(res, 200, { ok: true });
  }
  return bad(res, 'This feature is not configured yet.', 503);
}

function instructorRequestStats(items = []) {
  const stats = { pending: 0, approved: 0, rejected: 0, revoked: 0, total: items.length };
  for (const item of items) {
    const status = String(item.status || 'pending').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(stats, status)) stats[status] += 1;
  }
  return stats;
}

async function proxyToMonsterAsp(req, res) {
  const incomingUrl = new URL(req.url || '/api/levelup', `https://${req.headers.host || 'localhost'}`);
  const cleanPath = incomingUrl.pathname.replace(/^\/api\/levelup\/?/, '');
  const targetUrl = `${MONSTERASP_API_BASE_URL}${cleanPath ? `/${cleanPath}` : ''}${incomingUrl.search}`;
  const headers = {
    accept: req.headers.accept || 'application/json',
    'content-type': req.headers['content-type'] || 'application/json',
  };
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (req.headers.cookie) headers.cookie = req.headers.cookie;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
  });

  const text = await response.text();
  res.status(response.status);
  const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';
  res.setHeader('Content-Type', contentType);
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) res.setHeader('Set-Cookie', setCookie);
  return res.send(text);
}

function shouldProxyToMonsterAsp(req) {
  if (process.env.LEVELUP_USE_MONSTERASP === 'false') return false;
  const incomingUrl = new URL(req.url || '/api/levelup', `https://${req.headers.host || 'localhost'}`);
  const firstPart = incomingUrl.pathname
    .replace(/^\/api\/levelup\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)[0] || 'health';
  return MONSTERASP_PROXY_ROOTS.has(firstPart);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}$${digest}`;
}

function verifyPassword(password, stored = '') {
  const [salt, expected] = String(stored).split('$');
  if (!salt || !expected) return false;
  const candidate = hashPassword(password, salt).split('$')[1];
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(user) {
  const secret = process.env.LEVELUP_JWT_SECRET || 'dev-secret-change-me';
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: user.id,
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
  }));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function verifyToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) return null;
  const secret = process.env.LEVELUP_JWT_SECRET || 'dev-secret-change-me';
  const expected = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  if (expected !== sig) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  const sql = getSql();
  const rows = await sql`select * from users where id = ${payload.sub} limit 1`;
  return rows[0] || null;
}

function publicUser(user = {}) {
  const { password_hash: _passwordHash, ...safe } = user;
  return {
    ...safe,
    uid: safe.id,
    displayName: safe.name || '',
    emailVerified: Boolean(safe.email_otp_verified),
    isVerified: Boolean(safe.email_otp_verified),
    emailOtpVerified: Boolean(safe.email_otp_verified),
    approved: Boolean(safe.approved),
    photoUrl: safe.photo_url || '',
  };
}

async function requireUser(req, res) {
  const user = await verifyToken(req);
  if (!user) {
    bad(res, 'Authentication required.', 401);
    return null;
  }
  return user;
}

async function requireAdminish(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!['admin', 'instructor'].includes(user.role)) {
    bad(res, 'Admin or instructor access required.', 403);
    return null;
  }
  return user;
}

async function initDb() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const sql = getSql();
    await sql`
      create table if not exists users (
        id text primary key,
        email text unique not null,
        password_hash text not null,
        name text default '',
        role text default 'student',
        status text default 'active',
        approved boolean default false,
        photo_url text default '',
        email_otp_verified boolean default false,
        otp_hash text,
        otp_expires_at timestamptz,
        otp_last_sent_at timestamptz,
        otp_attempts integer default 0,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`alter table users add column if not exists otp_hash text`;
    await sql`alter table users add column if not exists otp_expires_at timestamptz`;
    await sql`alter table users add column if not exists otp_last_sent_at timestamptz`;
    await sql`alter table users add column if not exists otp_attempts integer default 0`;
    await sql`alter table users alter column email_otp_verified set default false`;
    await sql`
      create table if not exists courses (
        id text primary key,
        data jsonb not null,
        featured_rank integer,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists mentors (
        id text primary key,
        data jsonb not null,
        featured_rank integer,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists transactions (
        id text primary key,
        data jsonb not null,
        user_id text default '',
        mentor_id text default '',
        status text default 'waiting',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists instructor_requests (
        id text primary key,
        user_id text unique not null,
        data jsonb not null,
        status text default 'pending',
        requested_at timestamptz default now(),
        updated_at timestamptz default now(),
        resolved_at timestamptz
      )
    `;
    await sql`
      create table if not exists notifications (
        id text primary key,
        user_id text default '',
        title text not null,
        message text default '',
        icon text default '',
        is_read boolean default false,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists chats (
        id text primary key,
        conversation_key text unique not null,
        data jsonb not null,
        user_id text not null,
        mentor_id text not null,
        last_message_at timestamptz default now(),
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists chat_messages (
        id text primary key,
        conversation_key text not null,
        data jsonb not null,
        created_at timestamptz default now()
      )
    `;
    await sql`
      create table if not exists files (
        id text primary key,
        filename text not null,
        content_type text default 'application/octet-stream',
        data_base64 text not null,
        owner_id text default '',
        created_at timestamptz default now()
      )
    `;
    await bootstrapAdmins();
    await seedCatalog();
  })();
  return readyPromise;
}

async function bootstrapAdmins() {
  const sql = getSql();
  for (const [alias, password] of Object.entries(DEFAULT_ADMINS)) {
    for (const domain of ['levelup.admin', 'levelup.app']) {
      const email = `${alias}@${domain}`;
      const existing = await sql`select id from users where email = ${email} limit 1`;
      if (existing.length) {
        await sql`update users set role = 'admin', status = 'active', approved = true, updated_at = now() where email = ${email}`;
      } else {
        await sql`
          insert into users (id, email, password_hash, name, role, status, approved, email_otp_verified)
          values (${makeId('usr_')}, ${email}, ${hashPassword(password)}, ${capitalize(alias)}, 'admin', 'active', true, true)
        `;
      }
    }
  }
}

async function seedCatalog() {
  const sql = getSql();
  const courseRows = await sql`select count(*)::int as count from courses`;
  const mentorRows = await sql`select count(*)::int as count from mentors`;
  if (courseRows[0]?.count > 0 && mentorRows[0]?.count > 0) return;

  let seed = { courses: [], mentors: [] };
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'server/levelup-api/seed_data.json'), 'utf8');
    seed = JSON.parse(raw);
  } catch {
    return;
  }

  if (courseRows[0]?.count === 0) {
    for (const course of seed.courses || []) {
      await sql`
        insert into courses (id, data, featured_rank)
        values (${course.id || makeId('crs_')}, ${JSON.stringify(course)}, ${toNullableInt(course.featuredRank)})
        on conflict (id) do nothing
      `;
    }
  }
  if (mentorRows[0]?.count === 0) {
    for (const mentor of seed.mentors || []) {
      await sql`
        insert into mentors (id, data, featured_rank)
        values (${mentor.id || makeId('mnt_')}, ${JSON.stringify(mentor)}, ${toNullableInt(mentor.featuredRank)})
        on conflict (id) do nothing
      `;
    }
  }
}

function capitalize(value = '') {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function toNullableInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapJsonRecord(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return {
    ...data,
    id: row.id,
    featuredRank: row.featured_rank ?? data.featuredRank ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function verifyGoogleIdToken(idToken, clientId) {
  const params = new URLSearchParams({ id_token: idToken });
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?${params.toString()}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error('Could not verify Google sign-in.');
  const allowed = new Set([
    clientId,
    process.env.LEVELUP_GOOGLE_CLIENT_ID,
    DEFAULT_GOOGLE_CLIENT_ID,
  ].filter(Boolean));
  if (!allowed.has(payload.aud)) throw new Error('Google token was issued for a different client id.');
  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google email is not verified.');
  }
  return payload;
}

async function handleAuth(req, res, parts) {
  const sql = getSql();
  if (req.method === 'POST' && ['signup', 'register'].includes(parts[1])) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || req.body?.fullName || '').trim();
    const requestedRole = String(req.body?.role || 'student').trim().toLowerCase();
    const role = requestedRole === 'instructor' ? 'instructor' : 'student';
    if (!email.includes('@')) return bad(res, 'Valid email is required.');
    if (password.length < 6) return bad(res, 'Password must be at least 6 characters.');
    const id = makeId('usr_');
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const otpConfig = getOtpConfig();
    const otpExpiresAt = new Date(Date.now() + otpConfig.expiresMinutes * 60 * 1000).toISOString();
    try {
      const rows = await sql`
        insert into users (id, email, password_hash, name, role, email_otp_verified, otp_hash, otp_expires_at, otp_last_sent_at, otp_attempts)
        values (${id}, ${email}, ${hashPassword(password)}, ${name}, ${role}, false, ${otpHash}, ${otpExpiresAt}, now(), 0)
        returning *
      `;
      const user = rows[0];
      const delivery = await notifyVerificationOtp(email, otp);
      if (!shouldEnforceEmailVerification()) {
        return send(res, 201, {
          token: signToken(user),
          pendingVerification: false,
          emailDelivery: delivery.ok ? 'sent' : 'failed',
          emailDeliveryError: delivery.ok ? undefined : delivery.error,
          message: 'Registration successful.',
          user: publicUser(user),
        });
      }
      return send(res, 201, {
        pendingVerification: true,
        emailDelivery: delivery.ok ? 'sent' : 'failed',
        emailDeliveryError: delivery.ok ? undefined : delivery.error,
        message: 'Registration successful. Please verify your email first.',
        user: publicUser(user),
      });
    } catch {
      return bad(res, 'Email is already in use.', 409);
    }
  }

  if (req.method === 'POST' && ['signin', 'login'].includes(parts[1])) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rows = await sql`select * from users where email = ${email} limit 1`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return bad(res, 'Invalid email or password.', 401);
    }
    if (shouldEnforceEmailVerification() && !user.email_otp_verified) {
      return bad(res, 'Please verify your email first', 403, 'EMAIL_NOT_VERIFIED');
    }
    return send(res, 200, { token: signToken(user), user: publicUser(user) });
  }

  if (req.method === 'POST' && parts[1] === 'verify-otp') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || req.body?.code || '').trim();
    const otpConfig = getOtpConfig();
    if (!email.includes('@')) return bad(res, 'Valid email is required.');
    if (!/^\d{6}$/.test(otp)) return bad(res, 'OTP must be a 6-digit code.');

    const rows = await sql`select * from users where email = ${email} limit 1`;
    const user = rows[0];
    if (!user) return bad(res, 'User was not found', 404, 'USER_NOT_FOUND');
    if (user.email_otp_verified) return bad(res, 'Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    if ((user.otp_attempts || 0) >= otpConfig.maxAttempts) {
      return bad(res, 'Maximum verification attempts exceeded. Please request a new OTP.', 429, 'OTP_ATTEMPTS_EXCEEDED');
    }
    if (!user.otp_hash || !user.otp_expires_at || new Date(user.otp_expires_at).getTime() <= Date.now()) {
      return bad(res, 'OTP has expired. Please request a new OTP.', 400, 'OTP_EXPIRED');
    }

    if (!compareOTP(otp, user.otp_hash)) {
      const nextAttempts = (user.otp_attempts || 0) + 1;
      await sql`update users set otp_attempts = ${nextAttempts}, updated_at = now() where id = ${user.id}`;
      if (nextAttempts >= otpConfig.maxAttempts) {
        return bad(res, 'Maximum verification attempts exceeded. Please request a new OTP.', 429, 'OTP_ATTEMPTS_EXCEEDED');
      }
      return bad(res, 'Invalid OTP code', 400, 'INVALID_OTP');
    }

    const updatedRows = await sql`
      update users set email_otp_verified = true,
        otp_hash = null,
        otp_expires_at = null,
        otp_last_sent_at = null,
        otp_attempts = 0,
        updated_at = now()
      where id = ${user.id}
      returning *
    `;
    const verifiedUser = updatedRows[0];
    return send(res, 200, { token: signToken(verifiedUser), user: publicUser(verifiedUser) });
  }

  if (req.method === 'POST' && parts[1] === 'resend-otp') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otpConfig = getOtpConfig();
    if (!email.includes('@')) return bad(res, 'Valid email is required.');
    const rows = await sql`select * from users where email = ${email} limit 1`;
    const user = rows[0];
    if (!user) return send(res, 202, { ok: true, message: 'If the email exists, a verification OTP will be sent.' });
    if (user.email_otp_verified) return bad(res, 'Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');

    const lastSentAt = user.otp_last_sent_at ? new Date(user.otp_last_sent_at).getTime() : 0;
    const waitMs = otpConfig.resendCooldownSeconds * 1000 - (Date.now() - lastSentAt);
    if (waitMs > 0) {
      return send(res, 429, {
        error: 'Please wait before requesting another OTP.',
        code: 'OTP_RESEND_COOLDOWN',
        retryAfterSeconds: Math.ceil(waitMs / 1000),
      });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + otpConfig.expiresMinutes * 60 * 1000).toISOString();
    await sql`
      update users set otp_hash = ${otpHash},
        otp_expires_at = ${otpExpiresAt},
        otp_last_sent_at = now(),
        otp_attempts = 0,
        updated_at = now()
      where id = ${user.id}
    `;
    const delivery = await notifyVerificationOtp(email, otp);
    if (!delivery.ok) {
      return bad(res, `OTP email could not be sent: ${delivery.error}`, 503, 'OTP_EMAIL_FAILED');
    }
    return send(res, 202, { ok: true, message: 'Verification OTP sent.' });
  }

  if (req.method === 'POST' && parts[1] === 'google') {
    const credential = String(req.body?.credential || req.body?.idToken || '').trim();
    const clientId = String(req.body?.clientId || process.env.LEVELUP_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
    if (!credential) return bad(res, 'Missing Google credential.');
    let profile;
    try {
      profile = await verifyGoogleIdToken(credential, clientId);
    } catch (error) {
      return bad(res, error.message, 401);
    }
    const email = String(profile.email || '').trim().toLowerCase();
    const name = String(profile.name || email.split('@')[0]).trim();
    const picture = String(profile.picture || '').trim();
    const existing = await sql`select * from users where email = ${email} limit 1`;
    let user = existing[0];
    if (user) {
      const rows = await sql`
        update users set name = coalesce(nullif(${name}, ''), name),
          photo_url = coalesce(nullif(${picture}, ''), photo_url),
          email_otp_verified = true,
          updated_at = now()
        where id = ${user.id}
        returning *
      `;
      user = rows[0];
    } else {
      const rows = await sql`
        insert into users (id, email, password_hash, name, photo_url, email_otp_verified)
        values (${makeId('usr_')}, ${email}, ${hashPassword(crypto.randomBytes(32).toString('hex'))}, ${name}, ${picture}, true)
        returning *
      `;
      user = rows[0];
    }
    return send(res, 200, { token: signToken(user), user: publicUser(user) });
  }

  if (req.method === 'GET' && parts[1] === 'me') {
    const user = await requireUser(req, res);
    if (!user) return;
    return send(res, 200, { user: publicUser(user) });
  }

  return bad(res, 'Not found.', 404);
}

async function handleMe(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const name = req.body?.name;
  const photoUrl = req.body?.photoUrl;
  const role = user.role === 'admin' ? req.body?.role : undefined;
  const status = req.body?.status;
  const sql = getSql();
  const rows = await sql`
    update users set
      name = coalesce(${name ?? null}, name),
      photo_url = coalesce(${photoUrl ?? null}, photo_url),
      role = coalesce(${role ?? null}, role),
      status = coalesce(${status ?? null}, status),
      updated_at = now()
    where id = ${user.id}
    returning *
  `;
  return send(res, 200, { user: publicUser(rows[0]) });
}

async function handleCatalog(req, res, parts, table, prefix) {
  const sql = getSql();
  const id = parts[1] || '';
  const isCourses = table === 'courses';
  if (req.method === 'GET' && !id) {
    const rows = isCourses
      ? await sql`select * from courses order by coalesce(featured_rank, 999999), created_at desc`
      : await sql`select * from mentors order by coalesce(featured_rank, 999999), created_at desc`;
    return send(res, 200, { items: rows.map(mapJsonRecord) });
  }
  if (req.method === 'POST' && !id) {
    const user = await requireAdminish(req, res);
    if (!user) return;
    const item = { ...req.body, id: req.body?.id || makeId(prefix), createdAt: nowIso(), updatedAt: nowIso() };
    const rows = isCourses
      ? await sql`
        insert into courses (id, data, featured_rank)
        values (${item.id}, ${JSON.stringify(item)}, ${toNullableInt(item.featuredRank)})
        returning *
      `
      : await sql`
        insert into mentors (id, data, featured_rank)
        values (${item.id}, ${JSON.stringify(item)}, ${toNullableInt(item.featuredRank)})
        returning *
      `;
    return send(res, 201, { item: mapJsonRecord(rows[0]) });
  }
  if (req.method === 'PATCH' && id) {
    const user = await requireAdminish(req, res);
    if (!user) return;
    const currentRows = isCourses
      ? await sql`select * from courses where id = ${id} limit 1`
      : await sql`select * from mentors where id = ${id} limit 1`;
    if (!currentRows.length) return bad(res, 'Not found.', 404);
    const current = mapJsonRecord(currentRows[0]);
    const next = { ...current, ...req.body, id, updatedAt: nowIso() };
    const rows = isCourses
      ? await sql`
        update courses set data = ${JSON.stringify(next)}, featured_rank = ${toNullableInt(next.featuredRank)}, updated_at = now()
        where id = ${id}
        returning *
      `
      : await sql`
        update mentors set data = ${JSON.stringify(next)}, featured_rank = ${toNullableInt(next.featuredRank)}, updated_at = now()
        where id = ${id}
        returning *
      `;
    return send(res, 200, { item: mapJsonRecord(rows[0]) });
  }
  if (req.method === 'DELETE' && id) {
    const user = await requireAdminish(req, res);
    if (!user) return;
    if (isCourses) await sql`delete from courses where id = ${id}`;
    else await sql`delete from mentors where id = ${id}`;
    return send(res, 200, { ok: true });
  }
  return bad(res, 'Not found.', 404);
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['paid', 'approved', 'accept', 'accepted', 'success'].includes(raw)) return 'paid';
  if (['rejected', 'declined', 'denied'].includes(raw)) return 'rejected';
  return 'waiting';
}

async function handleTransactions(req, res, parts, query) {
  const sql = getSql();
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parts[1] || '';
  if (req.method === 'GET' && !id) {
    let rows;
    if (query.role === 'admin' && user.role === 'admin') {
      rows = await sql`select * from transactions order by created_at desc`;
    } else if (query.role === 'instructor') {
      rows = await sql`select * from transactions where mentor_id = ${query.mentorId || user.id} order by created_at desc`;
    } else {
      rows = await sql`select * from transactions where user_id = ${query.userId || user.id} order by created_at desc`;
    }
    return send(res, 200, { items: rows.map((row) => ({ ...row.data, id: row.id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at })) });
  }
  if (req.method === 'POST' && !id) {
    const item = {
      ...req.body,
      id: makeId('tx_'),
      userId: req.body?.userId || user.id,
      userEmail: req.body?.userEmail || user.email,
      userName: req.body?.userName || user.name || user.email.split('@')[0],
      status: 'waiting',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const rows = await sql`
      insert into transactions (id, data, user_id, mentor_id, status)
      values (${item.id}, ${JSON.stringify(item)}, ${item.userId}, ${item.mentorId || ''}, 'waiting')
      returning *
    `;
    return send(res, 201, { item: { ...rows[0].data, id: rows[0].id } });
  }
  if (req.method === 'PATCH' && id && parts[2] === 'status') {
    const admin = await requireAdminish(req, res);
    if (!admin) return;
    const status = normalizeStatus(req.body?.status);
    const rows = await sql`
      update transactions set status = ${status}, data = jsonb_set(data, '{status}', to_jsonb(${status}::text)), updated_at = now()
      where id = ${id}
      returning *
    `;
    if (!rows.length) return bad(res, 'Not found.', 404);
    return send(res, 200, { item: { ...rows[0].data, id: rows[0].id, status: rows[0].status } });
  }
  return bad(res, 'Not found.', 404);
}

async function handleInstructorRequests(req, res, parts, query) {
  const sql = getSql();
  const id = parts[1] || '';
  if (req.method === 'GET' && parts[1] === 'stats') {
    const user = await requireAdminish(req, res);
    if (!user) return;
    const rows = await sql`
      select status, count(*)::int as count
      from instructor_requests
      group by status
    `;
    const stats = { pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 };
    for (const row of rows) {
      const status = String(row.status || 'pending');
      if (Object.prototype.hasOwnProperty.call(stats, status)) stats[status] = row.count;
      stats.total += row.count;
    }
    return send(res, 200, stats);
  }
  if (req.method === 'GET') {
    const user = await requireAdminish(req, res);
    if (!user) return;
    const rows = query.status
      ? await sql`select * from instructor_requests where status = ${query.status} order by requested_at desc`
      : await sql`select * from instructor_requests order by requested_at desc`;
    return send(res, 200, { items: rows.map((row) => ({ ...row.data, id: row.id, userId: row.user_id, status: row.status, requestedAt: row.requested_at, updatedAt: row.updated_at, resolvedAt: row.resolved_at })) });
  }
  if (req.method === 'POST') {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const category = String(req.body?.category || '').trim();
    const userId = String(req.body?.userId || '').trim() || makeGuestInstructorUserId(email);
    if (!name || !email || !phone || !category) {
      return bad(res, 'Missing required instructor application fields.');
    }
    const data = {
      ...req.body,
      userId,
      name,
      email,
      phone,
      category,
      status: 'pending',
    };
    const existing = await sql`select id from instructor_requests where user_id = ${userId} limit 1`;
    if (existing.length) {
      const rows = await sql`
        update instructor_requests set data = ${JSON.stringify(data)}, status = 'pending', updated_at = now()
        where user_id = ${userId}
        returning *
      `;
      const item = { ...rows[0].data, id: rows[0].id, userId, status: rows[0].status };
      await notifyInstructorRequest(item);
      return send(res, 200, { item });
    }
    const rows = await sql`
      insert into instructor_requests (id, user_id, data, status)
      values (${makeId('irq_')}, ${userId}, ${JSON.stringify(data)}, 'pending')
      returning *
    `;
    const item = { ...rows[0].data, id: rows[0].id, userId, status: rows[0].status };
    await notifyInstructorRequest(item);
    return send(res, 201, { item });
  }
  if (req.method === 'PATCH' && id && parts[2] === 'status') {
    const admin = await requireAdminish(req, res);
    if (!admin) return;
    const status = String(req.body?.status || 'pending').trim();
    const rows = await sql`
      update instructor_requests set status = ${status}, data = jsonb_set(data, '{status}', to_jsonb(${status}::text)), updated_at = now(), resolved_at = now()
      where id = ${id}
      returning *
    `;
    if (!rows.length) return bad(res, 'Not found.', 404);
    if (status === 'approved') {
      await sql`update users set role = 'instructor', approved = true, updated_at = now() where id = ${rows[0].user_id}`;
    }
    return send(res, 200, { item: { ...rows[0].data, id: rows[0].id, status: rows[0].status } });
  }
  return bad(res, 'Not found.', 404);
}

async function handleNotifications(req, res, parts) {
  const sql = getSql();
  const user = await requireUser(req, res);
  if (!user) return;
  const id = parts[1] || '';
  if (req.method === 'GET') {
    const rows = await sql`select * from notifications where user_id in ('', ${user.id}) order by created_at desc`;
    return send(res, 200, { items: rows.map((row) => ({ id: row.id, userId: row.user_id, title: row.title, message: row.message, icon: row.icon, isRead: row.is_read, createdAt: row.created_at })) });
  }
  if (req.method === 'POST') {
    const admin = await requireAdminish(req, res);
    if (!admin) return;
    const rows = await sql`
      insert into notifications (id, user_id, title, message, icon)
      values (${makeId('ntf_')}, ${req.body?.userId || ''}, ${req.body?.title || ''}, ${req.body?.message || ''}, ${req.body?.icon || ''})
      returning *
    `;
    return send(res, 201, { item: rows[0] });
  }
  if (req.method === 'PATCH' && id && parts[2] === 'read') {
    const rows = await sql`update notifications set is_read = true, updated_at = now() where id = ${id} returning *`;
    return send(res, 200, { item: rows[0] || null });
  }
  if (req.method === 'DELETE' && id) {
    await sql`delete from notifications where id = ${id}`;
    return send(res, 200, { ok: true });
  }
  return bad(res, 'Not found.', 404);
}

async function handleChats(req, res, parts, query) {
  const sql = getSql();
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method === 'POST' && parts[1] === 'ensure') {
    const key = req.body?.conversationKey || req.body?.conversationId;
    if (!key) return bad(res, 'conversationKey is required.');
    const data = { ...req.body, conversationKey: key, updatedAt: nowIso() };
    const rows = await sql`
      insert into chats (id, conversation_key, data, user_id, mentor_id)
      values (${makeId('cht_')}, ${key}, ${JSON.stringify(data)}, ${data.userId || user.id}, ${data.mentorId || ''})
      on conflict (conversation_key) do update set data = excluded.data, user_id = excluded.user_id, mentor_id = excluded.mentor_id, updated_at = now()
      returning *
    `;
    return send(res, 200, { item: { ...rows[0].data, id: rows[0].id } });
  }
  if (req.method === 'GET' && !parts[1]) {
    let rows;
    if (query.role === 'admin' && user.role === 'admin') {
      rows = await sql`select * from chats order by last_message_at desc`;
    } else if (query.role === 'instructor') {
      rows = await sql`select * from chats where mentor_id = ${query.participantId || user.id} order by last_message_at desc`;
    } else {
      rows = await sql`select * from chats where user_id = ${query.participantId || user.id} order by last_message_at desc`;
    }
    return send(res, 200, { items: rows.map((row) => ({ ...row.data, id: row.id, conversationKey: row.conversation_key })) });
  }
  const conversationKey = parts[1] || '';
  if (req.method === 'GET' && parts[2] === 'messages') {
    const rows = await sql`select * from chat_messages where conversation_key = ${conversationKey} order by created_at asc`;
    return send(res, 200, { items: rows.map((row) => ({ ...row.data, id: row.id, conversationKey: row.conversation_key, createdAt: row.created_at })) });
  }
  if (req.method === 'POST' && parts[2] === 'messages') {
    const text = String(req.body?.text || '').trim();
    if (!text) return bad(res, 'Message text is required.');
    const data = { ...req.body, text, createdAt: nowIso() };
    const rows = await sql`
      insert into chat_messages (id, conversation_key, data)
      values (${makeId('msg_')}, ${conversationKey}, ${JSON.stringify(data)})
      returning *
    `;
    const isUser = data.senderRole === 'user';
    const patch = {
      lastMessage: text.length > 60 ? `${text.slice(0, 60)}...` : text,
      lastMessageAt: nowIso(),
      lastMessageFromUser: isUser,
      unreadForUser: isUser ? 0 : 1,
      updatedAt: nowIso(),
    };
    await sql`
      update chats set data = data || ${JSON.stringify(patch)}::jsonb, last_message_at = now(), updated_at = now()
      where conversation_key = ${conversationKey}
    `;
    return send(res, 201, { item: { ...rows[0].data, id: rows[0].id } });
  }
  if (req.method === 'PATCH' && parts[2] === 'read') {
    await sql`update chats set data = data || '{"unreadForUser":0}'::jsonb, updated_at = now() where conversation_key = ${conversationKey}`;
    return send(res, 200, { ok: true });
  }
  return bad(res, 'Not found.', 404);
}

async function handleUploads(req, res, parts) {
  const sql = getSql();
  if (req.method === 'GET' && parts[1]) {
    const rows = await sql`select * from files where id = ${parts[1]} limit 1`;
    if (!rows.length) return bad(res, 'File not found.', 404);
    const file = rows[0];
    const buffer = Buffer.from(file.data_base64, 'base64');
    res.setHeader('Content-Type', file.content_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  }
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method === 'POST' && parts[1] === 'base64') {
    const id = makeId('file_');
    const raw = String(req.body?.data || '');
    const dataBase64 = raw.includes(',') ? raw.split(',').pop() : raw;
    const filename = String(req.body?.filename || 'upload.bin').replace(/[^\w.-]/g, '_');
    const contentType = String(req.body?.contentType || 'application/octet-stream');
    await sql`
      insert into files (id, filename, content_type, data_base64, owner_id)
      values (${id}, ${filename}, ${contentType}, ${dataBase64}, ${user.id})
    `;
    return send(res, 201, { url: `/api/levelup/uploads/${id}`, filename });
  }
  return bad(res, 'Not found.', 404);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.LEVELUP_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const parts = url.pathname.replace(/^\/api\/levelup\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const query = Object.fromEntries(url.searchParams.entries());

    if (parts[0] === 'debug') {
      return handleDebug(req, res, parts, query);
    }

    if (parts[0] === 'auth') {
      if (!hasVercelDatabase()) return await sendNoDatabaseFallback(req, res, parts);
      await initDb();
      return handleAuth(req, res, parts);
    }

    if (shouldProxyToMonsterAsp(req)) {
      return await proxyToMonsterAsp(req, res);
    }

    if (LOCAL_FALLBACK_ROOTS.has(parts[0] || '')) {
      return await sendNoDatabaseFallback(req, res, parts);
    }

    if (!hasVercelDatabase()) {
      return await sendNoDatabaseFallback(req, res, parts);
    }

    await initDb();

    if (!parts.length || parts[0] === 'health') return send(res, 200, { ok: true, time: nowIso(), database: 'postgres' });
    if (parts[0] === 'users' && parts[1] === 'me' && req.method === 'PATCH') return handleMe(req, res);
    if (parts[0] === 'courses') return handleCatalog(req, res, parts, 'courses', 'crs_');
    if (parts[0] === 'mentors') return handleCatalog(req, res, parts, 'mentors', 'mnt_');
    if (parts[0] === 'transactions') return handleTransactions(req, res, parts, query);
    if (parts[0] === 'instructor-requests') return handleInstructorRequests(req, res, parts, query);
    if (parts[0] === 'notifications') return handleNotifications(req, res, parts);
    if (parts[0] === 'chats') return handleChats(req, res, parts, query);
    if (parts[0] === 'uploads') return handleUploads(req, res, parts);
    return bad(res, 'Not found.', 404);
  } catch (error) {
    return bad(res, error.message || 'Internal server error.', 500);
  }
}
