import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const menuItems = [
  {
    to: '/admin/dashboard',
    icon: 'bi-speedometer2',
    label: 'Dashboard',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/productos',
    icon: 'bi-box-seam',
    label: 'Productos',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/tipos-producto',
    icon: 'bi-tags',
    label: 'Tipos de producto',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/pedidos',
    icon: 'bi-receipt',
    label: 'Pedidos',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/kardex',
    icon: 'bi-journal-text',
    label: 'Kardex',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/proveedores',
    icon: 'bi-truck',
    label: 'Proveedores',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/ordenes-compra',
    icon: 'bi-bag-check',
    label: 'Órdenes de compra',
    roles: ['admin', 'worker'],
  },
  {
    to: '/admin/usuarios',
    icon: 'bi-people',
    label: 'Usuarios',
    roles: ['admin'],
  },
  {
    to: '/admin/scryfall-single',
    icon: 'bi-stars',
    label: 'Crear single desde Scryfall',
    roles: ['admin'],
  },
  {
    to: '/admin/pricing-settings',
    icon: 'bi-cash-stack',
    label: 'Configuración de precios',
    roles: ['admin'],
  },
];

export default function AdminSidebar({ open, onClose }) {
  const { logout, role, isAdmin, isWorker } = useAuth();
  const navigate = useNavigate();

  const canSee = (item) => {
    if (isAdmin) return true;
    if (isWorker) return item.roles.includes('worker');
    return item.roles.includes(role);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
      <div className="admin-brand">
        <i className="bi bi-magic me-2" />
        ManaMarket Admin
      </div>

      <nav className="d-flex flex-column gap-1">
        {menuItems.filter(canSee).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `admin-link ${isActive ? 'active' : ''}`
            }
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto d-grid gap-2 pt-3">
        <NavLink className="btn btn-outline-secondary" to="/" onClick={onClose}>
          Volver a la tienda
        </NavLink>

        <button type="button" className="btn btn-primary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
