import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

const roleLabels = {
  admin: 'Administrador',
  worker: 'Trabajador',
  customer: 'Cliente',
};

export default function MainLayout() {
  const {
    isAuthenticated,
    isAdmin,
    isWorker,
    isCustomer,
    role,
    logout,
  } = useAuth();

  const { items } = useCart();

  const roleLabel = roleLabels[role] || role || 'Cliente';
  const cartItemsCount = items?.length || 0;

  return (
    <>
      <nav className="navbar navbar-expand-lg main-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold brand-title" to="/">
            <i className="bi bi-magic me-2" />
            ManaMarket
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Abrir menú"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item">
                <NavLink className="nav-link" to="/catalogo">
                  Catálogo
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink className="nav-link" to="/carrito">
                  <i className="bi bi-cart3 me-1" />
                  Carrito ({cartItemsCount})
                </NavLink>
              </li>

              {isAuthenticated ? (
                <>
                  {isCustomer && (
                    <>
                      <li className="nav-item">
                        <NavLink className="nav-link" to="/mis-pedidos">
                          Pedidos
                        </NavLink>
                      </li>

                      <li className="nav-item">
                        <NavLink className="nav-link" to="/biblioteca">
                          Mis singles
                        </NavLink>
                      </li>
                    </>
                  )}

                  <li className="nav-item">
                    <NavLink className="nav-link" to="/mi-cuenta">
                      Perfil
                    </NavLink>
                  </li>

                  {(isAdmin || isWorker) && (
                    <li className="nav-item">
                      <NavLink className="nav-link" to="/admin">
                        Panel admin
                      </NavLink>
                    </li>
                  )}

                  <li className="nav-item">
                    <span className="badge role-badge">
                      Rol: {roleLabel}
                    </span>
                  </li>

                  <li className="nav-item">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={logout}
                    >
                      Cerrar sesión
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/login">
                      Login
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink className="btn btn-primary btn-sm" to="/registro">
                      Registro
                    </NavLink>
                  </li>
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
            <div className="col-md-4">
              <h6>
                <i className="bi bi-magic me-2" />
                ManaMarket
              </h6>
              <p>
                Tienda de Magic: The Gathering con singles, productos sellados,
                bundles y compras especiales para jugadores y coleccionistas.
              </p>
            </div>

            <div className="col-md-3">
              <h6>Enlaces</h6>
              <Link to="/catalogo" className="footer-link">
                Catálogo
              </Link>
              <Link to="/carrito" className="footer-link">
                Carrito
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/mis-pedidos" className="footer-link">
                    Mis pedidos
                  </Link>
                  <Link to="/mi-cuenta" className="footer-link">
                    Mi cuenta
                  </Link>
                </>
              )}
            </div>

            <div className="col-md-3">
              <h6>Comunidad</h6>
              <span className="footer-link" style={{ opacity: 0.5, cursor: 'default' }}>
                <i className="bi bi-discord me-2" />
                Discord
              </span>
              <span className="footer-link" style={{ opacity: 0.5, cursor: 'default' }}>
                <i className="bi bi-instagram me-2" />
                Instagram
              </span>
              <span className="footer-link" style={{ opacity: 0.5, cursor: 'default' }}>
                <i className="bi bi-facebook me-2" />
                Facebook
              </span>
            </div>

            <div className="col-md-2">
              <h6>Estado</h6>
              <span className="badge badge-success">Tienda activa</span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-top footer-bottom">
            <small>© 2026 ManaMarket. Todos los derechos reservados.</small>
          </div>
        </div>
      </footer>
    </>
  );
}