import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';
import {
  getAuthErrorMessage,
  requestEmailVerificationCodeForUser,
  verifyEmailVerificationCodeForUser,
} from '../state/auth.jsx';

const VERIFY_COOLDOWN_SECONDS = 60;
const OTP_PATTERN = /^\d{6}$/;
const PENDING_EMAIL_KEY = 'levelup_pending_verification_email';
const LEGACY_VERIFY_EMAIL_PATH = '/verify-email';

const SHOWCASE_CHIPS = ['Hashed OTP', '10 min expiry', 'Attempt limits'];
const SHOWCASE_METRICS = [
  { value: '60s', label: 'Resend cooldown' },
  { value: '5', label: 'Max attempts' },
  { value: '6', label: 'Digits only' },
];

function getRoleRedirect(role = 'student') {
  if (role === 'admin') return '/admin-courses';
  if (role === 'instructor') return '/mentor-courses';
  return '/home';
}

function getInitialEmail(location) {
  const fromState = (location.state?.email || '').toString().trim().toLowerCase();
  if (fromState) return fromState;
  try {
    return (sessionStorage.getItem(PENDING_EMAIL_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

function getCodeValidationMessage(value) {
  const normalizedValue = value.toString().trim();
  if (!normalizedValue) return 'Enter the 6-digit OTP from your email.';
  if (!OTP_PATTERN.test(normalizedValue)) return 'OTP must be exactly 6 digits.';
  return '';
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => getInitialEmail(location));
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState(location.state?.message || '');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(() => (getInitialEmail(location) ? VERIFY_COOLDOWN_SECONDS : 0));

  const displayEmail = useMemo(() => email || 'your email address', [email]);

  useEffect(() => {
    if (location.pathname !== LEGACY_VERIFY_EMAIL_PATH) return;
    navigate('/sign-in', { replace: true, state: email ? { email } : {} });
  }, [email, location.pathname, navigate]);

  useEffect(() => {
    if (!email) return;
    try {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } catch {
      // no-op
    }
  }, [email]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleResend = async () => {
    if (sending || cooldownSeconds > 0) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Enter your email first.');
      return;
    }

    setSending(true);
    setError('');
    try {
      await requestEmailVerificationCodeForUser(targetEmail);
      setCode('');
      setFeedback(`A new OTP was sent to ${targetEmail}.`);
      setCooldownSeconds(VERIFY_COOLDOWN_SECONDS);
    } catch (nextError) {
      const retryAfter = Number(nextError?.data?.retryAfterSeconds || nextError?.data?.details?.retryAfterSeconds || 0);
      if (retryAfter > 0) setCooldownSeconds(retryAfter);
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (verifying) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError('Enter the email you registered with.');
      return;
    }

    const validationMessage = getCodeValidationMessage(code);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const result = await verifyEmailVerificationCodeForUser({
        email: targetEmail,
        code,
      });
      try {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
      } catch {
        // no-op
      }
      setFeedback('Email verified. Redirecting...');
      navigate(getRoleRedirect(result.profile?.role), { replace: true });
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthRecoveryLayout
      pageLabel="Verify OTP"
      badge="Email OTP"
      title="Confirm your email address"
      subtitle="Enter the one-time password we sent after registration."
      showcaseEyebrow="Account Security"
      showcaseTitle="One short code unlocks the account."
      showcaseSubtitle="LevelUp keeps new accounts blocked until the inbox owner proves access with a short-lived OTP."
      showcaseChips={SHOWCASE_CHIPS}
      showcaseMetrics={SHOWCASE_METRICS}
    >
      <div className="forgot-reset-panel__inner">
        <div className="forgot-reset-panel__top">
          <button
            type="button"
            className="forgot-reset-panel__back"
            onClick={() => navigate('/sign-in', { replace: true, state: email ? { email } : {} })}
          >
            <span className="material-icons-round" aria-hidden>arrow_back</span>
            <span>Back to sign in</span>
          </button>
          <button type="button" className="forgot-reset-panel__link" onClick={() => navigate('/sign-up')}>
            Use another email
          </button>
        </div>

        <div className="forgot-reset-panel__content">
          <div className="forgot-reset-panel__main">
            <div className="forgot-reset-panel__status">
              <div className="forgot-reset-panel__status-icon forgot-reset-panel__spotlight--success" aria-hidden>
                <span className="material-icons-round">mark_email_unread</span>
              </div>
              <div>
                <strong>{feedback || `We sent a 6-digit OTP to ${displayEmail}.`}</strong>
                <p>Use the newest email only. The code expires quickly and wrong attempts are limited.</p>
              </div>
            </div>

            <div className="auth-field-block">
              <label className="auth-field-label" htmlFor="verification-email">Email</label>
              <div className="auth-field auth-field--plain">
                <input
                  id="verification-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
            </div>

            <div className="auth-field-block">
              <label className="auth-field-label" htmlFor="verification-code">OTP code</label>
              <div className="auth-field auth-field--plain verification-code-field">
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D+/g, '').slice(0, 6));
                    if (error) setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleVerify();
                    }
                  }}
                />
              </div>
            </div>

            {error ? <p className="forgot-reset-panel__error">{error}</p> : null}

            <div className="forgot-reset-panel__actions">
              <button
                type="button"
                className="auth-submit-btn auth-submit-btn--strong"
                onClick={handleVerify}
                disabled={verifying || sending}
              >
                {verifying ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="forgot-reset-panel__ghost"
                onClick={handleResend}
                disabled={sending || cooldownSeconds > 0}
              >
                {sending
                  ? 'Sending OTP...'
                  : cooldownSeconds > 0
                    ? `Resend OTP in ${cooldownSeconds}s`
                    : 'Resend OTP'}
              </button>
              <button
                type="button"
                className="forgot-reset-panel__ghost"
                onClick={() => navigate('/sign-in', { replace: true, state: email ? { email } : {} })}
              >
                Continue to login
              </button>
            </div>
          </div>

          <aside className="forgot-reset-panel__aside">
            <article className="forgot-reset-panel__usecase">
              <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>shield</span>
              <div>
                <strong>Protected registration</strong>
                <p>Login is blocked until this email verification step succeeds.</p>
              </div>
            </article>
            <article className="forgot-reset-panel__usecase">
              <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>timer</span>
              <div>
                <strong>Short-lived code</strong>
                <p>Request a new OTP if the current one expires or attempts run out.</p>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </AuthRecoveryLayout>
  );
}
