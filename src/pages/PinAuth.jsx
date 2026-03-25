import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { getPin } from '../state/security.js';

const KEYPAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, 'back'];

export default function PinAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { title, description, allowBiometric } = useMemo(() => {
    return (
      location.state || {
        title: 'Enter Your PIN',
        description: 'Please enter your PIN to continue',
        allowBiometric: false,
      }
    );
  }, [location.state]);

  const [digits, setDigits] = useState([]);
  const [mismatch, setMismatch] = useState(false);
  const [message, setMessage] = useState('');

  const handleDigit = (value) => {
    if (digits.length >= 4) return;
    setDigits((prev) => [...prev, value]);
    setMismatch(false);
  };

  const handleBackspace = () => {
    if (!digits.length) return;
    setDigits((prev) => prev.slice(0, -1));
    setMismatch(false);
  };

  const handleContinue = () => {
    if (digits.length < 4) {
      setMessage('Enter 4 digits to continue');
      return;
    }
    const saved = getPin();
    if (!saved || saved !== digits.join('')) {
      setMismatch(true);
      setDigits([]);
      setMessage('Incorrect PIN. Try again.');
      return;
    }
    navigate('/home', { replace: true });
  };

  return (
    <div className="pin-auth">
      <div className="pin-auth__top">
        <div className="pin-auth__header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>{title}</h2>
        </div>
        <div className="pin-auth__description">{description}</div>
        <div className={`pin-boxes ${mismatch ? 'mismatch' : ''}`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`pin-auth-${index}`} className="pin-box">
              {index < digits.length ? '*' : ''}
            </div>
          ))}
        </div>
        <div className="pin-mismatch">{mismatch ? 'Incorrect PIN' : ''}</div>
        <button type="button" className="pin-auth__forgot" onClick={() => navigate('/sign-in')}>
          Forgot PIN?
        </button>
      </div>
      <div className="pin-auth__bottom">
        <button type="button" className="svg-button" onClick={handleContinue}>
          <img src="/assets/fill_profile/BUTTON%20(3).png" alt="Continue" />
        </button>
        {allowBiometric ? (
          <button
            type="button"
            className="pin-auth__biometric"
            onClick={() => setMessage('Biometric authentication is not available on web.')}
          >
            Use fingerprint
          </button>
        ) : null}
        <div className="pin-keypad">
          {KEYPAD.map((value) => {
            if (value === 'back') {
              return (
                <button
                  key={value}
                  type="button"
                  className="pin-key pin-key--icon"
                  onClick={handleBackspace}
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M7.5 5h9.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7.5L3 12l4.5-7z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 9l6 6M16 9l-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              );
            }
            if (value === '*') {
              return (
                <button key={value} type="button" className="pin-key" disabled>
                  *
                </button>
              );
            }
            return (
              <button
                key={value}
                type="button"
                className="pin-key"
                onClick={() => handleDigit(value)}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
