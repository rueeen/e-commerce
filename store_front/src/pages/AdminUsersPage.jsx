import { useEffect, useRef, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'worker', label: 'Trabajador' },
  { value: 'customer', label: 'Cliente' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState(null);
  const hasLoaded = useRef(false);

  const loadUsers = async () => {
    try {
      const { data } = await api.adminUsers();
      setUsers(data.results || data);
    } catch (error) {
      if (error.response?.status !== 401) {
        notyf.error('No fue posible cargar usuarios');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    api.me().then(({ data }) => setMeId(data.id));
    loadUsers();
  }, []);

  const onFieldChange = (id, field, value) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, [field]: value } : user)));
  };

  const saveBasics = async (user) => {
    try {
      await api.adminUpdateUser(user.id, {
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      });
      notyf.success(`Usuario ${user.username} actualizado`);
    } catch {
      notyf.error('No fue posible actualizar el usuario');
      loadUsers();
    }
  };

  const changeRole = async (user, role) => {
    try {
      await api.adminUpdateUserRole(user.id, role);
      onFieldChange(user.id, 'role', role);
      notyf.success(`Rol de ${user.username} actualizado`);
    } catch {
      notyf.error('No fue posible cambiar el rol');
      loadUsers();
    }
  };

  const toggleStatus = async (user) => {
    try {
      const nextStatus = !user.is_active;
      await api.adminUpdateUserStatus(user.id, nextStatus);
      onFieldChange(user.id, 'is_active', nextStatus);
      notyf.success(`Estado de ${user.username} actualizado`);
    } catch {
      notyf.error('No fue posible cambiar el estado');
      loadUsers();
    }
  };

  if (loading) return <div className="alert alert-info">Cargando usuarios...</div>;

  return (
    <div className="card p-3 shadow-sm">
      <h2 className="mb-3">Administración de usuarios</h2>
      <div className="table-responsive">
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>Nombre</th><th>Apellido</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td><input className="form-control form-control-sm" value={user.username || ''} onChange={(e) => onFieldChange(user.id, 'username', e.target.value)} /></td>
                <td><input className="form-control form-control-sm" value={user.first_name || ''} onChange={(e) => onFieldChange(user.id, 'first_name', e.target.value)} /></td>
                <td><input className="form-control form-control-sm" value={user.last_name || ''} onChange={(e) => onFieldChange(user.id, 'last_name', e.target.value)} /></td>
                <td><input className="form-control form-control-sm" value={user.email || ''} onChange={(e) => onFieldChange(user.id, 'email', e.target.value)} /></td>
                <td>
                  <select className="form-select form-select-sm" value={user.role || 'customer'} onChange={(e) => changeRole(user, e.target.value)}>
                    {ROLES.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}
                  </select>
                </td>
                <td><span className={`badge ${user.is_active ? 'text-bg-success' : 'text-bg-secondary'}`}>{user.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => saveBasics(user)}>Guardar</button>
                  <button disabled={user.id===meId} className={`btn btn-sm ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleStatus(user)}>{user.id===meId ? 'Tu cuenta' : (user.is_active ? 'Desactivar' : 'Activar')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
