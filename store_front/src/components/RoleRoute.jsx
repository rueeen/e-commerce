import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleRoute({ children, allowRoles = [] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role || (user?.is_staff ? 'admin' : 'customer');
  if (!allowRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
