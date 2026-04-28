import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LogoutPage() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, []);
  return <Navigate to="/login" replace />;
}
