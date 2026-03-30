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
const SHOWCASE_CHIPS = ['Verified reset links', 'Strong password habits', 'Fast way back in'];
const SHOWCASE_METRICS = [
  { value: '6+', label: 'Characters minimum' },
  { value: '1', label: 'Fresh password' },
  { value: '0', label: 'Extra OTP steps' },
];

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
      showcaseChips={SHOWCASE_CHIPS}
      showcaseMetrics={SHOWCASE_METRICS}
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
          <div className="forgot-reset-panel__content">
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

            <aside className="forgot-reset-panel__aside">
              <article className="forgot-reset-panel__usecase forgot-reset-panel__usecase--soft">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>rule</span>
                <div>
                  <strong>Password checklist</strong>
                  <div className="forgot-reset-panel__checklist">
                    {passwordChecks.map((item) => (
                      <div
                        key={item.label}
                        className={`forgot-reset-panel__check ${item.passed ? 'is-passed' : ''}`}
                      >
                        <span className="material-icons-round" aria-hidden>
                          {item.passed ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>lock_clock</span>
                <div>
                  <strong>Make it memorable</strong>
                  <p>Use at least 6 characters and avoid recycling older passwords or very obvious patterns.</p>
                </div>
              </article>
              <article className="forgot-reset-panel__usecase">
                <span className="material-icons-round forgot-reset-panel__usecase-icon" aria-hidden>done_all</span>
                <div>
                  <strong>One-step finish</strong>
                  <p>After saving, we take you back to sign in with the updated password and the same email.</p>
                </div>
              </article>
            </aside>
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
