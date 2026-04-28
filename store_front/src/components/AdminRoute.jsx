import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="alert alert-danger mt-3">
        <i className="bi bi-shield-lock me-2" />Acceso denegado. Esta sección es solo para administradores.
      </div>
    );
  }
  return children;
}
