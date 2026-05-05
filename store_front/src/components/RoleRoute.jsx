import { Navigate } from 'react-router-dom';

import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export default function RoleRoute({ children, allowRoles = [] }) {
  const { isAuthenticated, initializing, role } = useAuth();

  if (initializing) {
    return <LoadingSpinner text="Validando permisos..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}