import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';

const SHOWCASE_CHIPS = ['Password updated', 'Ready to sign in', 'Learning flow restored'];
const SHOWCASE_METRICS = [
  { value: '4s', label: 'Auto redirect' },
  { value: '1', label: 'Account secured' },
  { value: 'Now', label: 'Continue learning' },
];

export default function PasswordResetSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state?.email || '').toString().trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/sign-in', {
        replace: true,
        state: email ? { email } : {},
      });
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [email, navigate]);

  return (
    <AuthRecoveryLayout
      pageLabel="Password reset success"
      badge="All Set"
      title="Your password is updated"
      subtitle="Your account is secured again. We will take you back to sign in automatically in a few seconds."
      showcaseEyebrow="Recovery Complete"
      showcaseTitle="You are ready to jump back in."
      showcaseSubtitle="The recovery flow now closes on the same polished experience as the login pages, with a clear success handoff back to sign in."
      showcaseChips={SHOWCASE_CHIPS}
      showcaseMetrics={SHOWCASE_METRICS}
    >
      <div className="forgot-reset-panel__inner forgot-reset-panel__inner--success">
        <div className="forgot-reset-panel__top">
          <button
            type="button"
            className="forgot-reset-panel__back"
            onClick={() => navigate('/sign-in', { replace: true, state: email ? { email } : {} })}
          >
            <span className="material-icons-round" aria-hidden>arrow_back</span>
            <span>Back</span>
          </button>
        </div>

        <div className="forgot-reset-success">
          <div className="forgot-reset-success__badge" aria-hidden>
            <span className="material-icons-round">task_alt</span>
          </div>
          <div className="forgot-reset-success__body">
            <strong>Password updated successfully</strong>
            <p>
              {email
                ? `You can now sign in again with ${email} and continue your courses.`
                : 'You can now sign in again and continue your courses.'}
            </p>
          </div>
        </div>

        <div className="forgot-reset-panel__timeline">
          <article className="forgot-reset-panel__timeline-item">
            <span>1</span>
            <div>
              <strong>Use the new password</strong>
              <p>Your old password is no longer the one you should use for this account.</p>
            </div>
          </article>
          <article className="forgot-reset-panel__timeline-item">
            <span>2</span>
            <div>
              <strong>Return to sign in</strong>
              <p>We are already preparing that step for you automatically.</p>
            </div>
          </article>
          <article className="forgot-reset-panel__timeline-item">
            <span>3</span>
            <div>
              <strong>Resume learning</strong>
              <p>Your profile, roadmap, and progress stay right where you left them.</p>
            </div>
          </article>
        </div>

        <div className="forgot-reset-panel__actions">
          <button
            type="button"
            className="auth-submit-btn auth-submit-btn--strong"
            onClick={() => navigate('/sign-in', { replace: true, state: email ? { email } : {} })}
          >
            Sign in now
          </button>
        </div>
      </div>
    </AuthRecoveryLayout>
  );
}
