import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ForgotPasswordOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fallbackEmail =
      (location.state?.contactValue || location.state?.maskedValue || '')
        .toString()
        .trim();

    navigate('/forgot-password', {
      replace: true,
      state: fallbackEmail.includes('@') ? { email: fallbackEmail } : {},
    });
  }, [location.state, navigate]);

  return null;
}
