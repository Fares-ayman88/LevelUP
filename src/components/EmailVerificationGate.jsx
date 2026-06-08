import { Navigate, useLocation } from 'react-router-dom';

import LoadingScreen from './LoadingScreen.jsx';
import {
  getVerificationEmail,
  isEmailVerificationRequired,
  useAuth,
} from '../state/auth.jsx';

const VERIFY_OTP_PATH = '/verify-otp';
const LEGACY_VERIFY_EMAIL_PATH = '/verify-email';

export default function EmailVerificationGate({ children }) {
  const location = useLocation();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Checking account..." />;
  }

  if (!user) {
    return children;
  }

  const verificationRequired = isEmailVerificationRequired(user, profile);
  const redirectTo =
    `${location.pathname}${location.search || ''}${location.hash || ''}` || '/home';

  if (verificationRequired && location.pathname !== VERIFY_OTP_PATH) {
    return (
      <Navigate
        to={VERIFY_OTP_PATH}
        replace
        state={{
          email: getVerificationEmail(user, profile),
          redirectTo,
        }}
      />
    );
  }

  if (
    !verificationRequired &&
    (location.pathname === LEGACY_VERIFY_EMAIL_PATH || location.pathname === VERIFY_OTP_PATH)
  ) {
    return <Navigate to={location.state?.redirectTo || '/home'} replace />;
  }

  return children;
}
