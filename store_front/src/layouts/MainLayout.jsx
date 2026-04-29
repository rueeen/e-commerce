import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function MainLayout() {
  const { isAuthenticated, isAdmin, isWorker, isCustomer, role, logout } = useAuth();
  const { items } = useCart();
  const roleLabel = { admin: 'Administrador', worker: 'Trabajador', customer: 'Cliente' }[role] || role;

  return (
    <>
      <nav className="navbar navbar-expand-lg main-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold brand-title" to="/">
            <i className="bi bi-magic me-2" />ManaMarket
          </Link>
          <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item"><NavLink className="nav-link" to="/catalog">Catálogo</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/cart"><i className="bi bi-cart3 me-1" />Carrito ({items.length})</NavLink></li>
              {isAuthenticated ? (
                <>
                  {isCustomer ? <li className="nav-item"><NavLink className="nav-link" to="/orders">Pedidos</NavLink></li> : null}
                  {isCustomer ? <li className="nav-item"><NavLink className="nav-link" to="/library">Mis singles</NavLink></li> : null}
                  <li className="nav-item"><NavLink className="nav-link" to="/profile">Perfil</NavLink></li>
                  {(isAdmin || isWorker) ? <li className="nav-item"><NavLink className="nav-link" to="/admin">Panel admin</NavLink></li> : null}
                  <li className="nav-item"><span className="badge role-badge">Rol: {roleLabel}</span></li>
                  <li className="nav-item"><button className="btn btn-outline-primary btn-sm" onClick={logout}>Logout</button></li>
                </>
              ) : (
                <>
                  <li className="nav-item"><NavLink className="nav-link" to="/login">Login</NavLink></li>
                  <li className="nav-item"><NavLink className="btn btn-primary btn-sm" to="/register">Registro</NavLink></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4 main-container">
        <Outlet />
      </main>

      <footer className="footer-main py-5 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-4"><h6><i className="bi bi-magic me-2" />ManaMarket</h6><p>Tienda de Magic: The Gathering con catálogo físico y digital para jugadores competitivos y coleccionistas.</p></div>
            <div className="col-md-3"><h6>Enlaces</h6><Link to="/catalog" className="footer-link">Catálogo</Link><a href="#" className="footer-link">Contacto</a><a href="#" className="footer-link">Términos</a><a href="#" className="footer-link">Ayuda</a></div>
            <div className="col-md-3"><h6>Comunidad</h6><a href="#" className="footer-link"><i className="bi bi-discord me-2" />Discord</a><a href="#" className="footer-link"><i className="bi bi-instagram me-2" />Instagram</a><a href="#" className="footer-link"><i className="bi bi-facebook me-2" />Facebook</a></div>
            <div className="col-md-2"><h6>Estado</h6><span className="badge badge-success">Tienda activa</span></div>
          </div>
          <div className="pt-4 mt-4 border-top footer-bottom">
            <small>© 2026 ManaMarket. Todos los derechos reservados.</small>
          </div>
        </div>
      </footer>
    </>
  );
}
