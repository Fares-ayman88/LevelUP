import { useNavigate } from 'react-router-dom';

import { setBiometricEnabled } from '../state/security.js';

const FingerprintIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="biometric-circle__icon">
    <path
      d="M4 10a8 8 0 0 1 16 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 10c0-2.8 2.2-5 5-5s5 2.2 5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 13c0 3 1.6 6 1.6 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M18 13c0 3-1.6 6-1.6 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M9.5 13c0 2 1 4 1 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M14.5 13c0 2-1 4-1 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function BiometricSetup() {
  const navigate = useNavigate();
  const label = 'Fingerprint';

  const handleSkip = async () => {
    await setBiometricEnabled(false);
    navigate('/home', { replace: true });
  };

  const handleEnable = async () => {
    await setBiometricEnabled(true);
    navigate('/biometric-success', { replace: true, state: { label } });
  };

  return (
    <div className="biometric-page">
      <div className="screen screen--narrow">
        <div className="page-header biometric-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Enable Biometric</h2>
        </div>
        <div className="biometric-circle">
          <FingerprintIcon />
        </div>
        <div className="biometric-title">Use {label} to secure your account</div>
        <p className="biometric-subtitle">
          Enable {label.toLowerCase()} for faster, safer sign-ins.
        </p>
        <button type="button" className="biometric-primary" onClick={handleEnable}>
          Enable {label}
        </button>
        <button type="button" className="biometric-skip" onClick={handleSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
