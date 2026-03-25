import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PasswordResetSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-badge success-badge--password">
          <span className="success-dot success-dot--orange" />
          <span className="success-dot success-dot--blue" />
          <span className="success-star success-star--yellow" />
          <span className="success-star success-star--red" />
          <span className="success-triangle success-triangle--green" />
          <div className="success-gear" />
          <div className="success-lock">
            <span className="success-lock__icon success-lock__icon--red" />
            <span className="success-lock__icon success-lock__icon--green" />
          </div>
        </div>
        <h3>Congratulations</h3>
        <p>
          Your Account is Ready to Use. You will be redirected to the Home Page
          in a Few Seconds.
        </p>
        <div className="success-loader" />
      </div>
    </div>
  );
}
