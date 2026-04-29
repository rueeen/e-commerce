import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(form);
    if (ok) navigate('/');
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <div className="panel-card p-4">
          <h2 className="mb-3">Login</h2>
          <form onSubmit={handleSubmit} className="d-grid gap-3">
            <input className="form-control" placeholder="Usuario" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            <input className="form-control" placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <button className="btn btn-primary" disabled={loading}>Ingresar</button>
          </form>
          <p className="mt-3 mb-0">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
        </div>
      </div>
    </div>
  );
}
