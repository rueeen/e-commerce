import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const items = [
  ['/admin/dashboard', 'bi-speedometer2', 'Dashboard'],
  ['/admin/productos', 'bi-box-seam', 'Productos'],
  ['/admin/categorias', 'bi-tags', 'Categorías'],
  ['/admin/usuarios', 'bi-people', 'Usuarios'],
  ['/admin/pedidos', 'bi-receipt', 'Pedidos'],
  ['/admin/importar-excel', 'bi-file-earmark-excel', 'Importar productos Excel'],
  ['/admin/scryfall-single', 'bi-stars', 'Crear single desde Scryfall'],
  ['/admin/pricing-settings', 'bi-cash-stack', 'Configuración de precios'],
  ['/admin/kardex', 'bi-journal-text', 'Kardex'],
  ['/admin/suppliers', 'bi-truck', 'Proveedores'],
  ['/admin/purchase-orders', 'bi-bag-check', 'Órdenes de compra'],
];

export default function AdminSidebar({ open, onClose }) {
  const { logout, isAdmin } = useAuth();
  const nav = useNavigate();

  return <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
    <div className="admin-brand">ManaMarket Admin</div>
    <nav className="d-flex flex-column gap-1">{items.filter((item) => isAdmin || item[0] !== '/admin/usuarios').map(([to, icon, label]) => <NavLink key={to} to={to} onClick={onClose} className="admin-link"><i className={`bi ${icon}`} />{label}</NavLink>)}</nav>
    <div className="mt-auto d-grid gap-2"><NavLink className="btn btn-outline-secondary" to="/">Volver a la tienda</NavLink><button className="btn btn-primary" onClick={() => { logout(); nav('/login'); }}>Cerrar sesión</button></div>
  </aside>;
}
