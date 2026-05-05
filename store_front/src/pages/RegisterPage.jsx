import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { notyf } from '../api/notifier';
import { useAuth } from '../hooks/useAuth';

const initialForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password_confirm: '',
};

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const username = form.username.trim();
    const email = form.email.trim();

    if (!username) {
      notyf.error('El usuario es obligatorio.');
      return false;
    }

    if (!email) {
      notyf.error('El email es obligatorio.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notyf.error('El email no tiene un formato válido.');
      return false;
    }

    if (form.password.length < 8) {
      notyf.error('La contraseña debe tener al menos 8 caracteres.');
      return false;
    }

    if (form.password !== form.password_confirm) {
      notyf.error('Las contraseñas no coinciden.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const ok = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      password: form.password,
    });

    if (ok) {
      notyf.success('Cuenta creada correctamente. Ahora puedes iniciar sesión.');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="panel-card p-4">
          <div className="mb-4">
            <h2 className="mb-1">Registro</h2>
            <p className="text-muted mb-0">
              Crea tu cuenta para comprar, revisar pedidos y guardar tu historial.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="d-grid gap-3">
            <div>
              <label className="form-label">Usuario *</label>
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
              <label className="form-label">Email *</label>
              <input
                className="form-control"
                placeholder="correo@ejemplo.com"
                type="email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  className="form-control"
                  placeholder="Nombre"
                  value={form.first_name}
                  onChange={(event) => updateForm('first_name', event.target.value)}
                  autoComplete="given-name"
                  disabled={loading}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  className="form-control"
                  placeholder="Apellido"
                  value={form.last_name}
                  onChange={(event) => updateForm('last_name', event.target.value)}
                  autoComplete="family-name"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Contraseña *</label>
              <input
                className="form-control"
                placeholder="Mínimo 8 caracteres"
                type="password"
                value={form.password}
                onChange={(event) => updateForm('password', event.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div>
              <label className="form-label">Confirmar contraseña *</label>
              <input
                className="form-control"
                placeholder="Repite tu contraseña"
                type="password"
                value={form.password_confirm}
                onChange={(event) =>
                  updateForm('password_confirm', event.target.value)
                }
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-3 mb-0 text-muted">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}