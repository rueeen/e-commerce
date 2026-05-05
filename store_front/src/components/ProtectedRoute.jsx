import { Navigate } from 'react-router-dom';

import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return <LoadingSpinner text="Validando sesión..." />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}