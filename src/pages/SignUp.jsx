import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { IconEye, IconEyeOff } from '../components/Icons.jsx';
import {
  getAuthErrorMessage,
  saveUserProfile,
  signUpWithEmail,
  updateAuthDisplayName,
} from '../state/auth.jsx';

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (loading) return;
    const normalizedName = name.trim();
    const value = email.trim();
    if (!normalizedName) {
      toast.warn('Enter your name.');
      return;
    }
    if (!value || !password || !confirmPassword) {
      toast.warn('Complete all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.warn('Password and confirm password must match.');
      return;
    }
    if (!gender) {
      toast.warn('Select your gender.');
      return;
    }
    if (!dateOfBirth) {
      toast.warn('Select your date of birth.');
      return;
    }
    setLoading(true);
    try {
      const result = await signUpWithEmail(value, password);
      const uid = result?.user?.uid;
      if (uid) {
        try {
          await saveUserProfile(uid, {
            name: normalizedName,
            fullName: normalizedName,
            email: value,
            gender,
            dateOfBirth,
          });
          await updateAuthDisplayName(normalizedName);
        } catch {
          toast.info('Account created. You can complete profile details later.');
        }
      }
      navigate('/verify-email', {
        replace: true,
        state: {
          email: value,
          redirectTo: '/home',
        },
      });
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
        <section className="auth-section auth-section--split" aria-label="Sign up form">
          <aside className="auth-showcase" aria-label="LevelUp onboarding highlights">
            <span className="auth-showcase__eyebrow">Get Started</span>
            <h2 className="auth-showcase__title">Build your account in one minute.</h2>
            <p className="auth-showcase__subtitle">
              Create your profile once, then unlock personalized recommendations and structured learning goals.
            </p>
            <div className="auth-showcase__chips">
              <span>Personalized Feed</span>
              <span>Smart Progress</span>
              <span>Community</span>
            </div>
            <div className="auth-showcase__metrics">
              <article className="auth-showcase__metric">
                <strong>24/7</strong>
                <span>Access</span>
              </article>
              <article className="auth-showcase__metric">
                <strong>10+</strong>
                <span>Learning paths</span>
              </article>
              <article className="auth-showcase__metric">
                <strong>100%</strong>
                <span>Free signup</span>
              </article>
            </div>
          </aside>

          <div className="auth-content">
            <header className="auth-hero auth-hero--left">
              <span className="auth-badge">Create Account</span>
              <h1 className="auth-title">Join LevelUp</h1>
              <p className="auth-subtitle">Set up your account and start learning in minutes.</p>
            </header>

            <div className="auth-card auth-card--reference">
              <form className="auth-form auth-register-form" onSubmit={handleSignUp}>
                <div className="auth-field auth-field--plain">
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="auth-field auth-field--plain">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="auth-field auth-field--plain">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
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

                <div className="auth-field auth-field--plain">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-field__toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>

                <div className="auth-register-gender">
                  <p className="auth-register-label">Select your Gender</p>
                  <label className="auth-register-radio">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={gender === 'male'}
                      onChange={(event) => setGender(event.target.value)}
                    />
                    <span>Male</span>
                  </label>
                  <label className="auth-register-radio">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={gender === 'female'}
                      onChange={(event) => setGender(event.target.value)}
                    />
                    <span>Female</span>
                  </label>
                </div>

                <div className="auth-field auth-field--plain auth-field--date">
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                  />
                </div>

                <button type="submit" className="auth-submit-btn auth-submit-btn--compact" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </button>

                <p className="auth-register-login">
                  Already have an account?{' '}
                  <button type="button" onClick={() => navigate('/sign-in', { replace: true })}>
                    Login here
                  </button>
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
