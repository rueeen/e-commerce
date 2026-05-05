import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const roleLabels = {
  admin: 'Administrador',
  worker: 'Trabajador',
  customer: 'Cliente',
};

export default function AdminHeader({ onMenu }) {
  const { user, role } = useAuth();

  const roleLabel = roleLabels[role] || role || 'Usuario';

  return (
    <header className="admin-header">
      <button
        type="button"
        className="btn btn-outline-primary d-lg-none"
        onClick={onMenu}
        aria-label="Abrir menú administrativo"
      >
        <i className="bi bi-list" />
      </button>

      <div className="flex-grow-1">
        <h1 className="h5 m-0">Panel administrativo</h1>
        <small className="text-muted">
          Gestión de catálogo, inventario, órdenes y usuarios
        </small>
      </div>

      <div className="d-none d-md-flex align-items-center gap-2">
        <span className="badge role-badge">
          {roleLabel}
        </span>

        <span className="text-muted small">
          {user?.username || 'Usuario'}
        </span>

        <Link to="/" className="btn btn-outline-secondary btn-sm">
          Ver tienda
        </Link>
      </div>
    </header>
  );
}