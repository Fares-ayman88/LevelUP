import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { IconEye, IconEyeOff } from '../components/Icons.jsx';
import {
  fetchUserProfile,
  getAuthErrorMessage,
  resolveStaticAdminAlias,
  sendPasswordReset,
  sendVerificationEmailForUser,
  signInStaticAdmin,
  signInWithEmail,
  signInWithGoogle,
  signOut as signOutCurrentUser,
} from '../state/auth.jsx';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const consumedRouteState = useRef(false);

  useEffect(() => {
    const state = location.state || {};
    if (consumedRouteState.current) return;
    if (state?.email && !email) setEmail(state.email);
    if (state?.verificationSent) {
      toast.info(`Verification email sent to ${state.email || 'your inbox'}. Confirm it before logging in.`);
    }
    if (state?.email || state?.verificationSent) {
      consumedRouteState.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, email]);

  const handleForgot = async () => {
    const value = email.trim();
    if (!value) {
      toast.warn('Enter your email to reset the password.');
      return;
    }
    try {
      await sendPasswordReset(value);
      toast.success(`Password reset link sent to ${value}`);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  const handleResendVerification = async () => {
    if (loading) return;
    const rawEmail = email.trim();
    if (!rawEmail || !password) {
      toast.warn('Enter email and password to resend verification.');
      return;
    }
    if (!rawEmail.includes('@')) {
      toast.warn('Use an email address to resend verification.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmail(rawEmail, password);
      const signedUser = result?.user;
      if (!signedUser) {
        toast.error('Could not verify this account right now.');
        return;
      }
      if (signedUser.emailVerified) {
        toast.info('This email is already verified.');
      } else {
        await sendVerificationEmailForUser(signedUser);
        toast.success(`Verification email sent to ${rawEmail}. Check Inbox/Spam/Promotions.`);
      }
      await signOutCurrentUser().catch(() => {});
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (
    userCredential,
    { forceHome = false } = {}
  ) => {
    const user = userCredential?.user;
    if (!user) {
      navigate('/home', { replace: true });
      return;
    }
    let profile = null;
    try {
      profile = await fetchUserProfile(user.uid);
    } catch {
      profile = null;
    }
    if (forceHome) {
      navigate('/home', { replace: true });
      return;
    }
    const displayName = (user.displayName || '').trim();
    const needsProfile = !profile || !(profile.name || displayName).trim();
    navigate(needsProfile ? '/fill-profile' : '/home', { replace: true });
  };

  const handleSignIn = async () => {
    if (loading) return;
    const rawEmail = email.trim();
    const adminAlias = resolveStaticAdminAlias(rawEmail);
    if (!rawEmail || !password) {
      toast.warn('Enter email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      if (adminAlias) {
        const user = await signInStaticAdmin(adminAlias, password);
        await handleSuccess({ user }, { forceHome: true });
      } else {
        const result = await signInWithEmail(rawEmail, password);
        const signedUser = result?.user;
        if (signedUser && !signedUser.emailVerified) {
          try {
            await sendVerificationEmailForUser(signedUser);
            toast.info('Email is not verified yet. We sent a verification link to your inbox.');
          } catch {
            // Ignore resend failure and still block unverified sign-in.
          }
          await signOutCurrentUser().catch(() => {});
          return;
        }
        await handleSuccess(result, { forceHome: true });
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const isNewUser = Boolean(result?.additionalUserInfo?.isNewUser);
      if (isNewUser) {
        navigate('/fill-profile', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell auth-shell">
      <MainBottomNav mode="auth" />
      <div className="screen screen--narrow auth-screen auth-screen--reference">
        <section className="auth-section auth-section--split" aria-label="Sign in form">
          <aside className="auth-showcase" aria-label="LevelUp highlights">
            <span className="auth-showcase__eyebrow">LevelUp Platform</span>
            <h2 className="auth-showcase__title">Learn smarter. Build faster.</h2>
            <p className="auth-showcase__subtitle">
              Pick up where you left off, continue your roadmap, and stay consistent with focused daily learning.
            </p>
            <div className="auth-showcase__chips">
              <span>Guided Tracks</span>
              <span>Mentor Support</span>
              <span>Certificates</span>
            </div>
            <div className="auth-showcase__metrics">
              <article className="auth-showcase__metric">
                <strong>95k+</strong>
                <span>Learners</span>
              </article>
              <article className="auth-showcase__metric">
                <strong>320+</strong>
                <span>Courses</span>
              </article>
              <article className="auth-showcase__metric">
                <strong>4.9</strong>
                <span>Avg rating</span>
              </article>
            </div>
          </aside>

          <div className="auth-content">
            <header className="auth-hero auth-hero--left">
              <span className="auth-badge">Welcome Back</span>
              <h1 className="auth-title">Sign in to continue</h1>
              <p className="auth-subtitle">Access your profile, courses, and settings.</p>
            </header>

            <div className="auth-card auth-card--reference">
              <div className="auth-form auth-form--login">
                

                <div className="auth-field-block">
                  <label className="auth-field-label" htmlFor="login-email">Email or admin alias</label>
                  <div className="auth-field">
                    <input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com or fares"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field-block">
                  <label className="auth-field-label" htmlFor="login-password">Password</label>
                  <div className="auth-field">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
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

                <div className="auth-row auth-row--between auth-row--meta">
                  <button type="button" className="auth-forgot" onClick={handleForgot}>
                    Forgot Password?
                  </button>
                  <button type="button" className="auth-resend" onClick={handleResendVerification}>
                    Resend verification
                  </button>
                </div>

                <button
                  type="button"
                  className="auth-submit-btn auth-submit-btn--strong"
                  disabled={loading}
                  onClick={handleSignIn}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="auth-divider auth-divider--fancy">Or Continue With</div>

                <div className="auth-socials">
                  <button
                    type="button"
                    className="social-button"
                    onClick={handleGoogle}
                    aria-label="Continue with Google"
                  >
                    <img src="/assets/auth_buttons/google.svg" alt="Google" className="auth-google-icon" />
                  </button>
                
                </div>

                <div className="auth-footer">
                  <span>Don't have an Account?</span>
                  <button type="button" onClick={() => navigate('/sign-up')}>
                    SIGN UP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
