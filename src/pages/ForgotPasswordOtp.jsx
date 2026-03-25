import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', 'back'],
];

export default function ForgotPasswordOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = useMemo(() => {
    return (
      location.state || {
        channelLabel: 'Via Email',
        contactValue: 'priscilla.frank26@gmail.com',
        maskedValue: 'priscilla.frank26@gmail.com',
      }
    );
  }, [location.state]);

  const [digits, setDigits] = useState([]);
  const [seconds, setSeconds] = useState(59);
  const isComplete = digits.length === 4;

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleDigit = (value) => {
    if (digits.length >= 4) return;
    setDigits((prev) => [...prev, value]);
  };

  const handleBackspace = () => {
    if (!digits.length) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleVerify = () => {
    if (!isComplete) return;
    navigate('/create-new-password', { replace: true });
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setSeconds(59);
  };

  return (
    <div className="otp-page">
      <div className="otp-top">
        <div className="screen screen--narrow">
          <div className="page-header otp-header">
            <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
              <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
            </button>
            <h2>Forgot Password</h2>
          </div>
          <div className="otp-subtitle">
            Code has been Send to {data.maskedValue}
          </div>
          <div className="otp-boxes">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`otp-${index}`} className="otp-box">
                {index < digits.length ? '*' : ''}
              </div>
            ))}
          </div>
          <div className="otp-timer">
            Resend Code in{' '}
            <button type="button" onClick={handleResend} disabled={seconds > 0}>
              {seconds}s
            </button>
          </div>
        </div>
      </div>
      <div className="otp-bottom">
        <button
          type="button"
          className={`otp-primary ${isComplete ? '' : 'disabled'}`}
          onClick={handleVerify}
          disabled={!isComplete}
        >
          <span>Verify</span>
          <span className="otp-primary__arrow">&gt;</span>
        </button>
        <div className="otp-keypad">
          {KEYPAD_ROWS.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="otp-keypad__row">
              {row.map((value) => {
                if (value === 'back') {
                  return (
                    <button
                      key={value}
                      type="button"
                      className="otp-key otp-key--icon"
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
                    <button key={value} type="button" className="otp-key" disabled>
                      *
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    type="button"
                    className="otp-key"
                    onClick={() => handleDigit(value)}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
