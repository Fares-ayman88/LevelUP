import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';
import { IconEye, IconEyeOff } from '../components/Icons.jsx';
import {
  confirmPasswordResetWithCode,
  getAuthErrorMessage,
  validatePasswordResetCode,
} from '../state/auth.jsx';

const MIN_PASSWORD_LENGTH = 6;

export default function CreateNewPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [formError, setFormError] = useState('');

  const mode = searchParams.get('mode') || '';
  const oobCode = searchParams.get('oobCode') || '';

  useEffect(() => {
    let cancelled = false;

    const resolveResetCode = async () => {
      if (!oobCode || (mode && mode !== 'resetPassword')) {
        setLinkError('Open the password reset link from your email to continue.');
        setCheckingLink(false);
        return;
      }

      setCheckingLink(true);
      setLinkError('');

      try {
        const recoveredEmail = await validatePasswordResetCode(oobCode);
        if (cancelled) return;
        setEmail(recoveredEmail || '');
      } catch (nextError) {
        if (cancelled) return;
        setLinkError(getAuthErrorMessage(nextError));
      } finally {
        if (!cancelled) {
          setCheckingLink(false);
        }
      }
    };

    resolveResetCode();

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const handleContinue = async () => {
    if (saving || checkingLink || !oobCode) return;

    const normalizedPassword = password.toString();
    const normalizedConfirm = confirm.toString();

    if (!normalizedPassword || !normalizedConfirm) {
      setFormError('Enter and confirm your new password.');
      return;
    }
    if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password should be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (normalizedPassword !== normalizedConfirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await confirmPasswordResetWithCode(oobCode, normalizedPassword);
      navigate('/password-reset-success', {
        replace: true,
        state: email ? { email } : {},
      });
    } catch (nextError) {
      const code = nextError?.code || '';
      if (
        code === 'auth/expired-action-code' ||
        code === 'expired-action-code' ||
        code === 'auth/invalid-action-code' ||
        code === 'invalid-action-code'
      ) {
        setLinkError(getAuthErrorMessage(nextError));
      } else {
        setFormError(getAuthErrorMessage(nextError));
      }
    } finally {
      setSaving(false);
    }
  };

  const showForm = !checkingLink && !linkError;
  const passwordChecks = [
    {
      label: 'At least 6 characters',
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      label: 'Confirmation matches',
      passed: confirm.length > 0 && password === confirm,
    },
    {
      label: 'Looks ready to save',
      passed: password.length >= MIN_PASSWORD_LENGTH && confirm.length > 0 && password === confirm,
    },
  ];

  const showcaseAccordionItems = showForm
    ? [
        {
          key: 'password-rules',
          icon: 'rule',
          title: 'Password rules',
          content: (
            <div className="auth-showcase__accordion-stack">
              <p className="auth-showcase__accordion-copy">
                Keep this checklist green before you save the new password for {email || 'your account'}.
              </p>
              <div className="auth-showcase__accordion-checks">
                {passwordChecks.map((item) => (
                  <div
                    key={item.label}
                    className={`auth-showcase__accordion-check ${item.passed ? 'is-active' : ''}`}
                  >
                    <span className="material-icons-round" aria-hidden>
                      {item.passed ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          key: 'link-safety',
          icon: 'verified_user',
          title: 'Reset link safety',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>link</span>
                <div>
                  <strong>One-time recovery link</strong>
                  <p>This reset link should be treated as private and cannot be reused after a successful save.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>mail</span>
                <div>
                  <strong>Latest email wins</strong>
                  <p>If you asked for more than one reset email, the newest message is the safe one to follow.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'after-save',
          icon: 'login',
          title: 'After you save',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>lock_reset</span>
                <div>
                  <strong>Old password is retired</strong>
                  <p>Use the new password only after this step completes.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>school</span>
                <div>
                  <strong>Progress stays intact</strong>
                  <p>Your roadmap, profile, and course history stay right where you left them.</p>
                </div>
              </div>
            </div>
          ),
        },
      ]
    : [
        {
          key: 'link-status',
          icon: 'link_off',
          title: 'Why the link stopped',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>timer_off</span>
                <div>
                  <strong>Links can expire</strong>
                  <p>Reset links stop working after their valid window passes or after they were already used.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>warning</span>
                <div>
                  <strong>Wrong or incomplete link</strong>
                  <p>Opening an old email or a broken URL can also bring you here.</p>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: 'next-step',
          icon: 'refresh',
          title: 'Best next step',
          content: (
            <div className="auth-showcase__accordion-points">
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>mail_lock</span>
                <div>
                  <strong>Request a fresh email</strong>
                  <p>Go back to forgot password and generate a new link from the latest request.</p>
                </div>
              </div>
              <div className="auth-showcase__accordion-point">
                <span className="material-icons-round" aria-hidden>login</span>
                <div>
                  <strong>Return to sign in</strong>
                  <p>If you remember the password after all, you can leave this flow and sign in directly.</p>
                </div>
              </div>
            </div>
          ),
        },
      ];

  return (
    <AuthRecoveryLayout
      pageLabel="Create new password"
      badge={checkingLink ? 'Validating Link' : (showForm ? 'Secure Update' : 'Reset Link Needed')}
      title={checkingLink ? 'Checking your reset link...' : (showForm ? 'Create a fresh password' : 'Request a new reset link')}
      subtitle={showForm
        ? 'Set a new password for your account and return to sign in with confidence.'
        : 'This step only works from a valid reset email, so we can confirm the request is really yours.'}
      showcaseEyebrow="Password Update"
      showcaseTitle="Give your next sign-in a cleaner start."
      showcaseSubtitle="The reset screen now follows the same premium login experience while keeping the security steps clear and lightweight."
      showcaseAccordionItems={showcaseAccordionItems}
    >
      <div className="forgot-reset-panel__inner">
        <div className="forgot-reset-panel__top">
          <button type="button" className="forgot-reset-panel__back" onClick={() => navigate(-1)}>
            <span className="material-icons-round" aria-hidden>arrow_back</span>
            <span>Back</span>
          </button>
          <button
            type="button"
            className="forgot-reset-panel__link"
            onClick={() => navigate('/sign-in', { replace: true, state: email ? { email } : {} })}
          >
            Back to sign in
          </button>
        </div>

        {showForm ? (
          <div className="forgot-reset-panel__content forgot-reset-panel__content--single">
            <div className="forgot-reset-panel__main">
              <div className="forgot-reset-panel__intro">
                <div className="forgot-reset-panel__spotlight forgot-reset-panel__spotlight--success">
                  <span className="material-icons-round" aria-hidden>verified_user</span>
                </div>
                <div>
                  <strong>Reset confirmed for {email || 'your account'}</strong>
                  <p>
                    Pick a password you have not used before. Once saved, this link cannot be reused.
                  </p>
                </div>
              </div>

              <div className="auth-field-block">
                <label className="auth-field-label" htmlFor="reset-password">New password</label>
                <div className="auth-field">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a new password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (formError) setFormError('');
                    }}
                  />
                  <button
                    type="button"
                    className="auth-field__toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <div className="auth-field-block">
                <label className="auth-field-label" htmlFor="reset-confirm">Confirm password</label>
                <div className="auth-field">
                  <input
                    id="reset-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value);
                      if (formError) setFormError('');
                    }}
                  />
                  <button
                    type="button"
                    className="auth-field__toggle"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirm ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {formError ? <p className="forgot-reset-panel__error">{formError}</p> : null}

              <div className="forgot-reset-panel__actions">
                <button
                  type="button"
                  className="auth-submit-btn auth-submit-btn--strong"
                  onClick={handleContinue}
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="forgot-reset-panel__empty">
            <div className="forgot-reset-panel__status forgot-reset-panel__status--warning">
              <div className="forgot-reset-panel__status-icon forgot-reset-panel__status-icon--warning" aria-hidden>
                <span className="material-icons-round">
                  {checkingLink ? 'hourglass_top' : 'link_off'}
                </span>
              </div>
              <div>
                <strong>
                  {checkingLink ? 'We are validating your reset request.' : 'This reset link is unavailable.'}
                </strong>
                <p>
                  {checkingLink
                    ? 'Please wait a moment while we confirm the link.'
                    : 'It may be expired, already used, or opened from the wrong address.'}
                </p>
              </div>
            </div>

            {linkError ? <p className="forgot-reset-panel__error">{linkError}</p> : null}

            {!checkingLink ? (
              <div className="forgot-reset-panel__actions">
                <button
                  type="button"
                  className="auth-submit-btn auth-submit-btn--strong"
                  onClick={() => navigate('/forgot-password', { replace: true })}
                >
                  Request a new link
                </button>
                <button
                  type="button"
                  className="forgot-reset-panel__ghost"
                  onClick={() => navigate('/sign-in', { replace: true })}
                >
                  Return to sign in
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AuthRecoveryLayout>
  );
}
