import { Navigate, useLocation } from 'react-router-dom';

import LoadingScreen from './LoadingScreen.jsx';
import {
  getVerificationEmail,
  isEmailVerificationRequired,
  useAuth,
} from '../state/auth.jsx';

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

  if (verificationRequired && location.pathname !== '/verify-email') {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{
          email: getVerificationEmail(user, profile),
          redirectTo,
        }}
      />
    );
  }

  if (!verificationRequired && location.pathname === '/verify-email') {
    return <Navigate to={location.state?.redirectTo || '/home'} replace />;
  }

  return children;
}
