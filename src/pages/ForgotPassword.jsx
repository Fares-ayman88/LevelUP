import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';
import {
  getAuthErrorMessage,
  getGenericPasswordResetMessage,
  sendPasswordReset,
} from '../state/auth.jsx';

const RESET_COOLDOWN_SECONDS = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHOWCASE_CHIPS = ['Secure email links', 'Fast recovery', 'No account guessing'];
const SHOWCASE_METRICS = [
  { value: '24/7', label: 'Self-service help' },
  { value: '30s', label: 'Resend cooldown' },
  { value: '100%', label: 'Progress preserved' },
];

function getEmailValidationMessage(value) {
  if (!value) return 'Enter the email linked to your account.';
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address.';
  return '';
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const consumedRouteState = useRef(false);
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const state = location.state || {};
    if (consumedRouteState.current) return;

    if (state?.email) {
      setEmail(state.email.toString().trim());
      consumedRouteState.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async () => {
    if (loading) return;

    const normalizedEmail = email.toString().trim().toLowerCase();
    const validationMessage = getEmailValidationMessage(normalizedEmail);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await sendPasswordReset(normalizedEmail);
      const nextEmail = result?.email || normalizedEmail;
      setSubmitted(true);
      setSubmittedEmail(nextEmail);
      setFeedback(getGenericPasswordResetMessage(nextEmail));
      setCooldownSeconds(RESET_COOLDOWN_SECONDS);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setSubmitted(false);
    setSubmittedEmail('');
    setFeedback('');
    setError('');
    setCooldownSeconds(0);
  };

  const handleBackToSignIn = () => {
    const value = submittedEmail || email.toString().trim();
    navigate('/sign-in', {
      replace: true,
      state: value ? { email: value } : {},
    });
  };

  return (
    <AuthRecoveryLayout
      pageLabel="Forgot password"
      badge={submitted ? 'Email Sent' : 'Password Help'}
      title={submitted ? 'Check your inbox' : 'Reset your password'}
      subtitle={submitted
        ? 'We sent guidance to your email. Open the newest message to continue securely.'
        : 'Recover access without losing your learning progress or exposing whether an account exists.'}
      showcaseEyebrow="Account Recovery"
      showcaseTitle="Get back into your learning flow."
      showcaseSubtitle="Recover your account with the same polished experience as the rest of LevelUp, while keeping security and privacy front and center."
      showcaseChips={SHOWCASE_CHIPS}
      showcaseMetrics={SHOWCASE_METRICS}
    >
      <div className="forgot-reset-panel__inner">
        <div className="forgot-reset-panel__top">
          <button type="button" className="forgot-reset-panel__back" onClick={() => navigate(-1)}>
            <span className="material-icons-round" aria-hidden>arrow_back</span>
            <span>Back</span>
          </button>
          <button type="button" className="forgot-reset-panel__link" onClick={handleBackToSignIn}>
            Back to sign in
          </button>
        </div>

        {!submitted ? (
          <div className="forgot-reset-panel__content">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__intro">
                <div className="forgot-reset-panel__spotlight">
                  <span className="material-icons-round" aria-hidden>shield</span>
                </div>
                <div>
                  <strong>Private by default</strong>
                  <p>
                    We always return a generic message here, so the flow stays safe even if someone types an email that is not registered.
                  </p>
                </div>
              </div>

              <div className="auth-field-block">
                <label className="auth-field-label" htmlFor="forgot-email">Account email</label>
                <div className="auth-field">
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSubmit();
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
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Sending link...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  className="forgot-reset-panel__ghost"
                  onClick={handleBackToSignIn}
                >
                  I remember my password
                </button>
              </div>
            </div>

            <aside className="forgot-reset-panel__aside">
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>mail</span>
                <div>
                  <strong>Didn&apos;t get the email?</strong>
                  <p>Wait a minute, then check Spam and Promotions before asking for another link.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>alternate_email</span>
                <div>
                  <strong>Using Google sign-in?</strong>
                  <p>Password reset emails only work for password-based accounts. If you normally use Google, go back and sign in with Google instead.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>edit</span>
                <div>
                  <strong>Typed the wrong address?</strong>
                  <p>Update the email before sending, so the reset link goes to the correct inbox the first time.</p>
                </div>
              </article>
            </aside>
          </div>
        ) : (
          <div className="forgot-reset-panel__content forgot-reset-panel__content--submitted">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__status">
                <div className="forgot-reset-panel__status-icon" aria-hidden>
                  <span className="material-icons-round">mark_email_read</span>
                </div>
                <div>
                  <strong>{feedback}</strong>
                  <p>Check Inbox, Spam, and Promotions. If you normally sign in with Google, no reset email will be sent for that flow.</p>
                </div>
              </div>

              <div className="forgot-reset-panel__timeline">
                <article className="forgot-reset-panel__timeline-item">
                  <span>1</span>
                  <div>
                    <strong>Open the email</strong>
                    <p>Look for the reset link sent to {submittedEmail || 'your inbox'}, including Spam and Promotions.</p>
                  </div>
                </article>
                <article className="forgot-reset-panel__timeline-item">
                  <span>2</span>
                  <div>
                    <strong>Create a new password</strong>
                    <p>Choose something fresh and stronger than the previous one.</p>
                  </div>
                </article>
                <article className="forgot-reset-panel__timeline-item">
                  <span>3</span>
                  <div>
                    <strong>Sign back in</strong>
                    <p>Return to LevelUp and continue your courses right away.</p>
                  </div>
                </article>
              </div>

              {error ? <p className="forgot-reset-panel__error">{error}</p> : null}

              <div className="forgot-reset-panel__actions">
                <button
                  type="button"
                  className="auth-submit-btn auth-submit-btn--strong"
                  onClick={handleSubmit}
                  disabled={loading || cooldownSeconds > 0}
                >
                  {loading
                    ? 'Sending link...'
                    : (cooldownSeconds > 0
                        ? `Resend link in ${cooldownSeconds}s`
                        : 'Resend reset link')}
                </button>
                <button
                  type="button"
                  className="forgot-reset-panel__ghost"
                  onClick={handleUseDifferentEmail}
                >
                  Use a different email
                </button>
              </div>
            </div>

            <aside className="forgot-reset-panel__aside">
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>schedule</span>
                <div>
                  <strong>Email still missing?</strong>
                  <p>If nothing arrives after a couple of minutes, first verify the exact email address, then use resend when the cooldown reaches zero.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>alternate_email</span>
                <div>
                  <strong>Is this a Google account?</strong>
                  <p>Google-only accounts will not receive a password reset email here. Use the Google sign-in button on the login page instead.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>login</span>
                <div>
                  <strong>Ready to come back?</strong>
                  <p>After updating the password, head back to sign in and continue from the same progress point.</p>
                </div>
              </article>
            </aside>
          </div>
        )}
      </div>
    </AuthRecoveryLayout>
  );
}
