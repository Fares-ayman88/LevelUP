import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { IconEye, IconEyeOff, IconLock } from '../components/Icons.jsx';

export default function CreateNewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleContinue = () => {
    navigate('/password-reset-success', { replace: true });
  };

  return (
    <div className="password-page">
      <div className="screen screen--narrow">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Create New Password</h2>
        </div>
        <div className="password-title">Create Your New Password</div>
        <div className="password-fields">
          <div className="auth-field">
            <span className="auth-field__icon">
              <IconLock />
            </span>
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
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          <div className="auth-field">
            <span className="auth-field__icon">
              <IconLock />
            </span>
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>
        <button type="button" className="primary-arrow" onClick={handleContinue}>
          <span>Continue</span>
          <span className="primary-arrow__icon">&gt;</span>
        </button>
      </div>
    </div>
  );
}
