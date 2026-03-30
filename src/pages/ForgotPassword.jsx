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

  const showcaseAccordionItems = submitted
    ? [
        {
          key: 'delivery',
          icon: 'forward_to_inbox',
          title: 'Inbox checklist',
          content: (
            <div className="auth-showcase__accordion-stack">
              <p className="auth-showcase__accordion-copy">
                Look for the newest reset email sent to {submittedEmail || 'your inbox'} before using resend.
              </p>
              <div className="auth-showcase__accordion-points">
                <div className="auth-showcase__accordion-point">
                  <span className="material-icons-round" aria-hidden>mark_email_read</span>
                  <div>
                    <strong>Check every mailbox tab</strong>
                    <p>Inbox, Spam, and Promotions are all worth checking before you request another link.</p>
                  </div>
                </div>
                <div className="auth-showcase__accordion-point">
                  <span className="material-icons-round" aria-hidden>verified</span>
                  <div>
                    <strong>Use the latest message</strong>
                    <p>The most recent email is the one to trust if you requested more than once.</p>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'recovery-steps',
          icon: 'published_with_changes',
          title: 'Recovery steps',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>looks_one</span>
                <div>
                  <strong>Open the email</strong>
                  <p>Use the reset link from the newest message only.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>looks_two</span>
                <div>
                  <strong>Create a new password</strong>
                  <p>Choose a password you have not used recently on this account.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>looks_3</span>
                <div>
                  <strong>Return to sign in</strong>
                  <p>Come back with the same email and continue your learning normally.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'privacy',
          icon: 'shield',
          title: 'Privacy guardrails',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>visibility_off</span>
                <div>
                  <strong>No account guessing</strong>
                  <p>We show a generic result so this page does not reveal whether the email exists.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>schedule</span>
                <div>
                  <strong>Safe resend timing</strong>
                  <p>The resend cooldown helps avoid accidental spam and keeps the flow predictable.</p>
                </div>
              </div>
            </div>
          ),
        },
      ]
    : [
        {
          key: 'recovery-controls',
          icon: 'manage_accounts',
          title: 'Recovery controls',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>alternate_email</span>
                <div>
                  <strong>Type the exact email</strong>
                  <p>Use the address linked to your LevelUp account so the message reaches the right inbox.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>mail_lock</span>
                <div>
                  <strong>Use an inbox you can open now</strong>
                  <p>You will need immediate access to the mailbox to continue the reset securely.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'delivery-tips',
          icon: 'inbox_customize',
          title: 'Inbox tips',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>drafts</span>
                <div>
                  <strong>Expect a reset link</strong>
                  <p>The email will guide you to create a new password without exposing account details on this page.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>report_gmailerrorred</span>
                <div>
                  <strong>Check Spam and Promotions too</strong>
                  <p>If it is not in your main inbox, those folders are the next best place to look.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'privacy',
          icon: 'shield',
          title: 'Privacy guardrails',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>policy</span>
                <div>
                  <strong>Generic success messaging</strong>
                  <p>We do not confirm whether an account exists, which protects people who type any email here.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>login</span>
                <div>
                  <strong>Quick exit path</strong>
                  <p>If you remember your password, you can jump back to sign in right away.</p>
                </div>
              </div>
            </div>
          ),
        },
      ];

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
      showcaseAccordionItems={showcaseAccordionItems}
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
          <div className="forgot-reset-panel__content forgot-reset-panel__content--single">
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
          </div>
        ) : (
          <div className="forgot-reset-panel__content forgot-reset-panel__content--single">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__status">
                <div className="forgot-reset-panel__status-icon" aria-hidden>
                  <span className="material-icons-round">mark_email_read</span>
                </div>
                <div>
                  <strong>{feedback}</strong>
                  <p>Check Inbox, Spam, and Promotions. The newest email is the one to trust.</p>
                </div>
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
          </div>
        )}
      </div>
    </AuthRecoveryLayout>
  );
}
