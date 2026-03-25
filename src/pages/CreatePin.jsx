import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { savePin } from '../state/security.js';

export default function CreatePin() {
  const navigate = useNavigate();
  const [input, setInput] = useState([]);
  const [savedPin, setSavedPin] = useState(null);
  const [step, setStep] = useState(0);
  const [mismatch, setMismatch] = useState(false);
  const [message, setMessage] = useState('');

  const isConfirm = step === 1;

  const handleDigit = (digit) => {
    if (input.length >= 4) return;
    const next = [...input, digit];
    setInput(next);
    setMismatch(false);
    if (next.length === 4 && !isConfirm) {
      setSavedPin(next);
      setInput([]);
      setStep(1);
    }
  };

  const handleBackspace = () => {
    if (!input.length) return;
    setInput((prev) => prev.slice(0, -1));
    setMismatch(false);
  };

  const handleContinue = async () => {
    if (input.length < 4 && !isConfirm) {
      setMessage('Enter 4 digits to continue');
      return;
    }
    if (!isConfirm) {
      setSavedPin(input);
      setInput([]);
      setStep(1);
      return;
    }
    const matches = savedPin && savedPin.join('') === input.join('');
    if (!matches) {
      setMismatch(true);
      setInput([]);
      setMessage('Pins do not match. Try again.');
      return;
    }
    await savePin(input.join(''));
    navigate('/biometric-setup', { replace: true });
  };

  const handleBack = () => {
    if (isConfirm) {
      setStep(0);
      setInput(savedPin || []);
      setMismatch(false);
      return;
    }
    navigate(-1);
  };

  const title = isConfirm ? 'Confirm Pin' : 'Create New Pin';
  const description = isConfirm
    ? 'Re-enter your pin to confirm'
    : 'Add a pin number to make your account more secure';

  return (
    <div className="pin-auth create-pin">
      <div className="pin-auth__top">
        <div className="pin-auth__header">
          <button type="button" className="icon-btn" onClick={handleBack}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>{title}</h2>
        </div>
        <div className="pin-auth__description">{description}</div>
        <div className={`pin-boxes ${mismatch ? 'mismatch' : ''}`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`pin-${index}`} className="pin-box">
              {index < input.length ? '*' : ''}
            </div>
          ))}
        </div>
        <div className="pin-mismatch">{mismatch ? 'Pins do not match' : ''}</div>
      </div>
      <div className="pin-auth__bottom">
        <button type="button" className="svg-button" onClick={handleContinue}>
          <img src="/assets/fill_profile/BUTTON%20(3).png" alt="Continue" />
        </button>
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button key={digit} type="button" className="pin-key" onClick={() => handleDigit(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" className="pin-key" disabled>
            *
          </button>
          <button type="button" className="pin-key" onClick={() => handleDigit(0)}>
            0
          </button>
          <button
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
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
