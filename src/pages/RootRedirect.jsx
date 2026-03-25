import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../state/auth.jsx';

export default function RootRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate(user ? '/home' : '/sign-in', { replace: true });
  }, [user, loading, navigate]);

  return null;
}
