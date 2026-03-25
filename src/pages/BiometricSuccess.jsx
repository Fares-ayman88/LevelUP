import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BiometricSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const label = useMemo(() => {
    return location.state?.label || 'Biometric';
  }, [location.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const headerTitle = label === 'Biometric' ? 'Enable Biometric' : `Set Your ${label}`;

  return (
    <div className="success-page success-page--dark">
      <div className="success-header">
        <button type="button" className="icon-btn dark" onClick={() => navigate(-1)}>
          <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
        </button>
        <h2>{headerTitle}</h2>
      </div>
      <div className="success-card">
        <div className="success-badge">
          <span className="success-dot success-dot--orange" />
          <span className="success-dot success-dot--blue" />
          <span className="success-star success-star--yellow" />
          <span className="success-star success-star--red" />
          <span className="success-triangle success-triangle--green" />
          <div className="success-check">
            <span className="success-check__mark" />
          </div>
        </div>
        <h3>Congratulations</h3>
        <p>
          Your account is ready to use. You will be redirected to the Home Page
          in a few seconds.
        </p>
        <div className="success-loader" />
      </div>
    </div>
  );
}
