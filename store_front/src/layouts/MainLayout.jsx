import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

export default function MainLayout() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { items } = useCart();

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            Store Front
          </Link>
          <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item"><NavLink className="nav-link" to="/catalog">Catálogo</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/cart">Carrito ({items.length})</NavLink></li>
              {isAuthenticated ? (
                <>
                  <li className="nav-item"><NavLink className="nav-link" to="/orders">Pedidos</NavLink></li>
                  <li className="nav-item"><NavLink className="nav-link" to="/library">Mis singles</NavLink></li>
                  <li className="nav-item"><NavLink className="nav-link" to="/profile">Perfil</NavLink></li>
                  {isAdmin ? <li className="nav-item"><NavLink className="nav-link" to="/admin/products">Admin</NavLink></li> : null}
                  <li className="nav-item"><button className="btn btn-outline-dark btn-sm" onClick={logout}>Logout</button></li>
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

      <main className="container py-4">
        <Outlet />
      </main>

      <footer className="bg-dark text-light py-4 mt-5">
        <div className="container d-flex justify-content-between flex-wrap gap-2">
          <span>© 2026 Store Front</span>
          <span>Ecommerce físico + digital</span>
        </div>
      </footer>
    </>
  );
}
