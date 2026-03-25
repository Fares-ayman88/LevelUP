import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';

const OPTIONS = [
  { id: 'remember_me', label: 'Remember Me', defaultValue: true },
  { id: 'biometric_id', label: 'Biometric ID', defaultValue: true },
  { id: 'face_id', label: 'Face ID', defaultValue: false },
];

const STORAGE_PREFIX = 'levelup_security_';

export default function Security() {
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const next = {};
    OPTIONS.forEach((option) => {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${option.id}`);
      next[option.id] = saved === null ? option.defaultValue : saved === 'true';
    });
    setValues(next);
  }, []);

  const toggleValue = (id) => {
    setValues((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, String(next[id]));
      return next;
    });
  };

  return (
    <div className="security-page">
      <div className="screen screen--narrow">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Security</h2>
        </div>
        <div className="security-list">
          {OPTIONS.map((option) => (
            <div key={option.id} className="security-row">
              <span>{option.label}</span>
              <button
                type="button"
                className={`security-toggle ${values[option.id] ? 'active' : ''}`}
                onClick={() => toggleValue(option.id)}
              >
                <span className="security-thumb" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="security-link"
            onClick={() => setMessage('Google Authenticator is coming soon.')}
          >
            <span>Google Authenticator</span>
            <span className="security-link__arrow">&gt;</span>
          </button>
        </div>
        <div className="security-actions">
          <button
            type="button"
            className="security-outline"
            onClick={() => setMessage('Change PIN is coming soon.')}
          >
            Change PIN
          </button>
          <button
            type="button"
            className="security-primary"
            onClick={() => navigate('/forgot-password')}
          >
            <span>Change Password</span>
            <span className="security-primary__arrow">&gt;</span>
          </button>
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
