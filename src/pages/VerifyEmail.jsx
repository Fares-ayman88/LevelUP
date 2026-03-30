import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';
import {
  getAuthErrorMessage,
  getVerificationEmail,
  isEmailVerificationRequired,
  requestEmailVerificationCodeForUser,
  signOut,
  useAuth,
  verifyEmailVerificationCodeForUser,
} from '../state/auth.jsx';

const VERIFY_COOLDOWN_SECONDS = 30;
const OTP_PATTERN = /^\d{6,8}$/;
const SHOWCASE_CHIPS = ['PocketBase OTP', 'Inbox testing', 'Safer password accounts'];
const SHOWCASE_METRICS = [
  { value: '30s', label: 'Resend cooldown' },
  { value: '1', label: 'Code to enter' },
  { value: '0', label: 'Firebase mail links' },
];

function getCodeValidationMessage(value) {
  const normalizedValue = value.toString().trim();
  if (!normalizedValue) return 'Enter the code we sent to your email.';
  if (!OTP_PATTERN.test(normalizedValue)) return 'Enter the 6 to 8 digit code.';
  return '';
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const requestedOnOpen = useRef(false);
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const targetEmail = useMemo(() => {
    const fromAccount = getVerificationEmail(user, profile);
    if (fromAccount) return fromAccount;
    return (location.state?.email || '').toString().trim().toLowerCase();
  }, [location.state, profile, user]);

  const hasSession = Boolean(user && targetEmail);
  const verificationRequired = isEmailVerificationRequired(user, profile);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleRequestCode = async () => {
    if (sending) return;
    if (!user) {
      setError('Sign in first so we know which account to verify.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const result = await requestEmailVerificationCodeForUser(user);
      setOtpId(result.otpId || '');
      setCode('');
      setFeedback(`We sent a verification code to ${result.email}. Check Inbox, Spam, and Promotions.`);
      setCooldownSeconds(VERIFY_COOLDOWN_SECONDS);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!verificationRequired || !hasSession || requestedOnOpen.current) return;
    requestedOnOpen.current = true;
    void handleRequestCode();
  }, [hasSession, verificationRequired]);

  const handleVerify = async () => {
    if (verifying) return;

    const validationMessage = getCodeValidationMessage(code);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (!otpId) {
      setError('Request a fresh code first.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      await verifyEmailVerificationCodeForUser({
        user,
        otpId,
        code,
      });
      setFeedback('Email verified. Taking you back to LevelUp.');
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setVerifying(false);
    }
  };

  const handleBackToSignIn = async () => {
    if (user) {
      await signOut().catch(() => {});
    }
    navigate('/sign-in', {
      replace: true,
      state: targetEmail ? { email: targetEmail } : {},
    });
  };

  const handleUseDifferentAccount = async () => {
    await signOut().catch(() => {});
    navigate('/sign-in', {
      replace: true,
      state: targetEmail ? { email: targetEmail } : {},
    });
  };

  return (
    <AuthRecoveryLayout
      pageLabel="Verify email"
      badge="Verify Email"
      title="Confirm your email address"
      subtitle="Enter the one-time code from your email so password-based accounts can continue securely."
      showcaseEyebrow="Account Security"
      showcaseTitle="Verify once, then continue without friction."
      showcaseSubtitle="This web flow now uses PocketBase OTP instead of Firebase mail links, so we can compare inbox placement and keep the verification step inside the same polished auth journey."
      showcaseChips={SHOWCASE_CHIPS}
      showcaseMetrics={SHOWCASE_METRICS}
    >
      <div className="forgot-reset-panel__inner">
        <div className="forgot-reset-panel__top">
          <button type="button" className="forgot-reset-panel__back" onClick={handleBackToSignIn}>
            <span className="material-icons-round" aria-hidden>arrow_back</span>
            <span>Back to sign in</span>
          </button>
          <button type="button" className="forgot-reset-panel__link" onClick={handleUseDifferentAccount}>
            Use another account
          </button>
        </div>

        {!hasSession ? (
          <div className="forgot-reset-panel__content forgot-reset-panel__content--submitted">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__status forgot-reset-panel__status--warning">
                <div className="forgot-reset-panel__status-icon forgot-reset-panel__status-icon--warning" aria-hidden>
                  <span className="material-icons-round">warning</span>
                </div>
                <div>
                  <strong>Sign in again to continue verification</strong>
                  <p>
                    We need an active session to connect the PocketBase verification code to your LevelUp account.
                  </p>
                </div>
              </div>

              <div className="forgot-reset-panel__actions">
                <button
                  type="button"
                  className="auth-submit-btn auth-submit-btn--strong"
                  onClick={() => navigate('/sign-in', { replace: true })}
                >
                  Go to sign in
                </button>
                <button
                  type="button"
                  className="forgot-reset-panel__ghost"
                  onClick={() => navigate('/sign-up', { replace: true })}
                >
                  Create a new account
                </button>
              </div>
            </div>

            <aside className="forgot-reset-panel__aside">
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>mail_lock</span>
                <div>
                  <strong>Why the extra step?</strong>
                  <p>Password-based accounts stay blocked until the email owner proves access to the inbox.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>shield</span>
                <div>
                  <strong>What changed?</strong>
                  <p>The web app now uses PocketBase OTP instead of Firebase verification links for this flow.</p>
                </div>
              </article>
            </aside>
          </div>
        ) : (
          <div className="forgot-reset-panel__content">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__status">
                <div className="forgot-reset-panel__status-icon forgot-reset-panel__spotlight--success" aria-hidden>
                  <span className="material-icons-round">mark_email_unread</span>
                </div>
                <div>
                  <strong>{feedback || `A verification code will be sent to ${targetEmail}.`}</strong>
                  <p>Open the newest message, copy the code, and enter it below to unlock your account.</p>
                </div>
              </div>

              <div className="auth-field-block">
                <label className="auth-field-label" htmlFor="verification-code">Verification code</label>
                <div className="auth-field auth-field--plain verification-code-field">
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter the email code"
                    maxLength={8}
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D+/g, '').slice(0, 8));
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
                  {verifying ? 'Verifying...' : 'Verify email'}
                </button>
                <button
                  type="button"
                  className="forgot-reset-panel__ghost"
                  onClick={handleRequestCode}
                  disabled={sending || cooldownSeconds > 0}
                >
                  {sending
                    ? 'Sending code...'
                    : (cooldownSeconds > 0
                        ? `Resend code in ${cooldownSeconds}s`
                        : 'Resend verification code')}
                </button>
              </div>

              <div className="forgot-reset-panel__help">
                <article className="forgot-reset-panel__help-item">
                  <span className="material-icons-round" aria-hidden>mark_email_read</span>
                  <div>
                    <strong>Can&apos;t find it?</strong>
                    <p>Check Inbox, Spam, and Promotions first. The latest email is the correct one to trust.</p>
                  </div>
                </article>
                <article className="forgot-reset-panel__help-item">
                  <span className="material-icons-round" aria-hidden>verified_user</span>
                  <div>
                    <strong>Trying to improve deliverability</strong>
                    <p>This flow is ready for PocketBase SMTP testing so we can compare inbox placement against Firebase.</p>
                  </div>
                </article>
                <article className="forgot-reset-panel__help-item">
                  <span className="material-icons-round" aria-hidden>manage_accounts</span>
                  <div>
                    <strong>Wrong email?</strong>
                    <p>Use the secondary action above to sign in with the correct account before entering the code.</p>
                  </div>
                </article>
              </div>
            </div>

            <aside className="forgot-reset-panel__aside">
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>contact_mail</span>
                <div>
                  <strong>Add the sender to safe contacts</strong>
                  <p>If you receive the code in Spam or Promotions, mark it as safe so future messages have a better chance of landing in Inbox.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>schedule</span>
                <div>
                  <strong>Code expired?</strong>
                  <p>Request a fresh one after the cooldown. Only the newest code should be entered.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>login</span>
                <div>
                  <strong>What happens next?</strong>
                  <p>As soon as the code is valid, you’ll be sent back into LevelUp and your password account will be treated as verified.</p>
                </div>
              </article>
            </aside>
          </div>
        )}
      </div>
    </AuthRecoveryLayout>
  );
}
