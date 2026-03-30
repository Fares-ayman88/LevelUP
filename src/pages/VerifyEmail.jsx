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

  const showcaseAccordionItems = hasSession
    ? [
        {
          key: 'verification-controls',
          icon: 'admin_panel_settings',
          title: 'Verification controls',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>pin</span>
                <div>
                  <strong>Enter the newest code only</strong>
                  <p>The latest verification email is the one that matches the current session.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>schedule</span>
                <div>
                  <strong>30 second resend cooldown</strong>
                  <p>Wait for the resend timer so you do not generate extra codes by mistake.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'inbox-testing',
          icon: 'mail_lock',
          title: 'Inbox testing',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>inbox_customize</span>
                <div>
                  <strong>Check Inbox, Spam, and Promotions</strong>
                  <p>We are comparing deliverability here, so the folder where the message lands matters.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>star</span>
                <div>
                  <strong>Mark the sender as safe</strong>
                  <p>If the code lands outside Inbox, add the sender to safe contacts for future messages.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'after-verify',
          icon: 'task_alt',
          title: 'After verification',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>login</span>
                <div>
                  <strong>Unlock the password account</strong>
                  <p>Once the code is valid, the account is treated as verified and the gate is lifted.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>school</span>
                <div>
                  <strong>Continue inside LevelUp</strong>
                  <p>You return to the same account flow without leaving the web app for an email link.</p>
                </div>
              </div>
            </div>
          ),
        },
      ]
    : [
        {
          key: 'why-verification',
          icon: 'shield',
          title: 'Why we ask for it',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>mail_lock</span>
                <div>
                  <strong>Inbox ownership check</strong>
                  <p>Password-based accounts stay blocked until the email owner proves access to the mailbox.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>verified_user</span>
                <div>
                  <strong>Protection before entry</strong>
                  <p>This prevents unverified addresses from using the account normally.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'what-changed',
          icon: 'swap_horiz',
          title: 'What changed',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>key</span>
                <div>
                  <strong>PocketBase OTP on web</strong>
                  <p>This flow now uses one-time codes instead of Firebase email links so we can compare delivery behavior.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>web</span>
                <div>
                  <strong>Stay in the same journey</strong>
                  <p>You verify inside the app instead of hopping out to a browser action link.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'next-step',
          icon: 'login',
          title: 'Next step',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>account_circle</span>
                <div>
                  <strong>Sign in again first</strong>
                  <p>We need an active password-account session before a code can be requested for verification.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>person_add</span>
                <div>
                  <strong>Or create a fresh account</strong>
                  <p>If this is not the right account, start over with the correct sign-up flow.</p>
                </div>
              </div>
            </div>
          ),
        },
      ];

  return (
    <AuthRecoveryLayout
      pageLabel="Verify email"
      badge="Verify Email"
      title="Confirm your email address"
      subtitle="Enter the one-time code from your email so password-based accounts can continue securely."
      showcaseEyebrow="Account Security"
      showcaseTitle="Verify once, then continue without friction."
      showcaseSubtitle="This web flow now uses PocketBase OTP instead of Firebase mail links, so we can compare inbox placement and keep the verification step inside the same polished auth journey."
      showcaseAccordionItems={showcaseAccordionItems}
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
          <div className="forgot-reset-panel__content forgot-reset-panel__content--single">
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
          </div>
        ) : (
          <div className="forgot-reset-panel__content forgot-reset-panel__content--single">
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
            </div>
          </div>
        )}
      </div>
    </AuthRecoveryLayout>
  );
}
