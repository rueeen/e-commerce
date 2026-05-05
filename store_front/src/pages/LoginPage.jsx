import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { notyf } from '../api/notifier';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      notyf.error('Debes ingresar usuario y contraseña.');
      return;
    }

    const ok = await login({
      username,
      password,
    });

    if (ok) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-5 col-lg-4">
        <div className="panel-card p-4">
          <div className="mb-4">
            <h2 className="mb-1">Iniciar sesión</h2>
            <p className="text-muted mb-0">
              Ingresa con tu cuenta para comprar, revisar pedidos y administrar tu perfil.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="d-grid gap-3">
            <div>
              <label className="form-label">Usuario</label>
              <input
                className="form-control"
                placeholder="Tu usuario"
                value={form.username}
                onChange={(event) => updateForm('username', event.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <input
                className="form-control"
                placeholder="Tu contraseña"
                type="password"
                value={form.password}
                onChange={(event) => updateForm('password', event.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-3 mb-0 text-muted">
            ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}