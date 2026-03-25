import { Navigate } from 'react-router-dom';

import LoadingScreen from './LoadingScreen.jsx';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

export default function RoleRoute({ roles, children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen label="Checking access..." />;
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!roles || roles.length === 0) {
    return children;
  }

  const role = resolveAuthRole(profile, user);
  if (!roles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
