import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthRecoveryLayout from '../components/AuthRecoveryLayout.jsx';

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

  const showcaseAccordionItems = [
    {
      key: 'handoff',
      icon: 'login',
      title: 'Sign-in handoff',
      content: (
        <div className="auth-showcase__accordion-points">
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>timer</span>
            <div>
              <strong>Automatic redirect in 4 seconds</strong>
              <p>The flow already prepares a return to sign in, so you do not have to start over manually.</p>
            </div>
          </div>
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>email</span>
            <div>
              <strong>Same account email</strong>
              <p>{email ? `You will continue with ${email}.` : 'You will continue with the same account you just recovered.'}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'security',
      icon: 'security',
      title: 'Security update',
      content: (
        <div className="auth-showcase__accordion-points">
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>lock_reset</span>
            <div>
              <strong>Old password is no longer valid</strong>
              <p>The new password is now the only one that should be used for this account.</p>
            </div>
          </div>
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>verified_user</span>
            <div>
              <strong>Recovery completed safely</strong>
              <p>This closes the reset flow and hands you back to normal sign-in.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'continuity',
      icon: 'school',
      title: 'Learning continuity',
      content: (
        <div className="auth-showcase__accordion-points">
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>menu_book</span>
            <div>
              <strong>Courses are still there</strong>
              <p>Your saved progress, roadmap, and profile data stay exactly where you left them.</p>
            </div>
          </div>
          <div className="auth-showcase__accordion-point">
            <span className="material-icons-round" aria-hidden>rocket_launch</span>
            <div>
              <strong>Jump back in quickly</strong>
              <p>Sign in with the new password and continue learning right away.</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AuthRecoveryLayout
      pageLabel="Password reset success"
      badge="All Set"
      title="Your password is updated"
      subtitle="Your account is secured again. We will take you back to sign in automatically in a few seconds."
      showcaseEyebrow="Recovery Complete"
      showcaseTitle="You are ready to jump back in."
      showcaseSubtitle="The recovery flow now closes on the same polished experience as the login pages, with a clear success handoff back to sign in."
      showcaseAccordionItems={showcaseAccordionItems}
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
