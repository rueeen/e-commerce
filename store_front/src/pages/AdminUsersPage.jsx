import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'worker', label: 'Trabajador' },
  { value: 'customer', label: 'Cliente' },
];

const normalizeList = (data) => data?.results || data || [];

const getRoleLabel = (role) => {
  return ROLES.find((option) => option.value === role)?.label || role;
};

const getRoleBadgeClass = (role) => {
  if (role === 'admin') return 'badge-warning';
  if (role === 'worker') return 'badge-success';
  return 'badge-soft';
};

const getErrorStatus = (error) => {
  return error?.response?.status || error?.status;
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [meId, setMeId] = useState(null);

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [roleSavingId, setRoleSavingId] = useState(null);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const hasLoaded = useRef(false);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const { data } = await api.adminUsers();
      setUsers(normalizeList(data));
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMe = async () => {
    try {
      const { data } = await api.me();
      setMeId(data.id);
    } catch (error) {
      if (getErrorStatus(error) === 401) {
        navigate('/login', { replace: true });
      }
    }
  };

  useEffect(() => {
    if (!token || hasLoaded.current) return;

    hasLoaded.current = true;
    loadMe();
    loadUsers();
  }, [navigate, token]);

  useEffect(() => {
    if (!roleChangeTarget) return;
    const el = document.getElementById('changeOwnRoleModal');
    if (el) {
      const modal = new window.bootstrap.Modal(el);
      modal.show();
    }
  }, [roleChangeTarget]);

  useEffect(() => {
    if (!statusTarget) return;
    const el = document.getElementById('toggleUserStatusModal');
    if (el) {
      const modal = new window.bootstrap.Modal(el);
      modal.show();
    }
  }, [statusTarget]);

  const filteredUsers = useMemo(() => {
    const search = q.trim().toLowerCase();

    return users.filter((user) => {
      const text = [
        user.id,
        user.username,
        user.first_name,
        user.last_name,
        user.email,
        user.role,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || text.includes(search);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesActive =
        !activeFilter || String(user.is_active) === activeFilter;

      return matchesSearch && matchesRole && matchesActive;
    });
  }, [users, q, roleFilter, activeFilter]);

  const onFieldChange = (id, field, value) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
            ...user,
            [field]: value,
          }
          : user
      )
    );
  };

  const saveBasics = async (user) => {
    if (!user.username?.trim()) {
      notyf.error('El username es obligatorio.');
      return;
    }

    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      notyf.error('El email no tiene un formato válido.');
      return;
    }

    setSavingId(user.id);

    try {
      await api.adminUpdateUser(user.id, {
        username: user.username.trim(),
        email: user.email?.trim() || '',
        first_name: user.first_name?.trim() || '',
        last_name: user.last_name?.trim() || '',
      });

      notyf.success(`Usuario ${user.username} actualizado.`);
      await loadUsers();
    } catch {
      await loadUsers();
    } finally {
      setSavingId(null);
    }
  };

  const executeChangeRole = async (user, role) => {
    setRoleSavingId(user.id);

    try {
      await api.adminUpdateUserRole(user.id, role);
      onFieldChange(user.id, 'role', role);
      notyf.success(`Rol de ${user.username} actualizado a ${getRoleLabel(role)}.`);
    } catch {
      await loadUsers();
    } finally {
      setRoleSavingId(null);
    }
  };

  const changeRole = (user, role) => {
    if (user.id === meId && role !== user.role) {
      setRoleChangeTarget({ user, role });
      return;
    }

    executeChangeRole(user, role);
  };

  const confirmChangeOwnRole = async () => {
    if (!roleChangeTarget) return;
    await executeChangeRole(roleChangeTarget.user, roleChangeTarget.role);
    setRoleChangeTarget(null);
  };

  const executeToggleStatus = async (user, nextStatus) => {
    setStatusSavingId(user.id);

    try {
      await api.adminUpdateUserStatus(user.id, nextStatus);
      onFieldChange(user.id, 'is_active', nextStatus);

      notyf.success(
        nextStatus
          ? `Usuario ${user.username} activado.`
          : `Usuario ${user.username} desactivado.`
      );
    } catch {
      await loadUsers();
    } finally {
      setStatusSavingId(null);
    }
  };

  const toggleStatus = (user) => {
    if (user.id === meId) {
      notyf.error('No puedes desactivar tu propia cuenta.');
      return;
    }

    const nextStatus = !user.is_active;

    setStatusTarget({ user, nextStatus });
  };

  const confirmToggleStatus = async () => {
    if (!statusTarget) return;
    await executeToggleStatus(statusTarget.user, statusTarget.nextStatus);
    setStatusTarget(null);
  };

  const clearFilters = () => {
    setQ('');
    setRoleFilter('');
    setActiveFilter('');
  };

  if (loading) {
    return <div className="alert alert-info">Cargando usuarios...</div>;
  }

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Administración de usuarios</h2>
          <p className="text-muted mb-0">
            Gestiona perfiles, roles y estado de acceso de los usuarios.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={loadUsers}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-5">
          <input
            className="form-control"
            placeholder="Buscar por username, nombre o email..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <select
            className="form-select"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div className="col-md-2">
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={clearFilters}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  No hay usuarios para los filtros seleccionados.
                </td>
              </tr>
            )}

            {filteredUsers.map((user) => {
              const savingBasics = savingId === user.id;
              const savingRole = roleSavingId === user.id;
              const savingStatus = statusSavingId === user.id;
              const isSelf = user.id === meId;

              return (
                <tr key={user.id}>
                  <td>{user.id}</td>

                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={user.username || ''}
                      onChange={(event) =>
                        onFieldChange(user.id, 'username', event.target.value)
                      }
                      disabled={savingBasics}
                    />
                  </td>

                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={user.first_name || ''}
                      onChange={(event) =>
                        onFieldChange(user.id, 'first_name', event.target.value)
                      }
                      disabled={savingBasics}
                    />
                  </td>

                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={user.last_name || ''}
                      onChange={(event) =>
                        onFieldChange(user.id, 'last_name', event.target.value)
                      }
                      disabled={savingBasics}
                    />
                  </td>

                  <td>
                    <input
                      className="form-control form-control-sm"
                      type="email"
                      value={user.email || ''}
                      onChange={(event) =>
                        onFieldChange(user.id, 'email', event.target.value)
                      }
                      disabled={savingBasics}
                    />
                  </td>

                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={user.role || 'customer'}
                        onChange={(event) => changeRole(user, event.target.value)}
                        disabled={savingRole}
                      >
                        {ROLES.map((roleOption) => (
                          <option
                            key={roleOption.value}
                            value={roleOption.value}
                          >
                            {roleOption.label}
                          </option>
                        ))}
                      </select>

                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`badge ${user.is_active ? 'badge-success' : 'badge-error'
                        }`}
                    >
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>

                    {isSelf && (
                      <div className="small text-muted mt-1">Tu cuenta</div>
                    )}
                  </td>

                  <td className="text-end">
                    <div className="d-flex justify-content-end flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => saveBasics(user)}
                        disabled={savingBasics}
                      >
                        {savingBasics ? 'Guardando...' : 'Guardar'}
                      </button>

                      <button
                        type="button"
                        disabled={isSelf || savingStatus}
                        className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-outline-success'
                          }`}
                        onClick={() => toggleStatus(user)}
                      >
                        {isSelf
                          ? 'Tu cuenta'
                          : savingStatus
                            ? 'Procesando...'
                            : user.is_active
                              ? 'Desactivar'
                              : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        id="changeOwnRoleModal"
        title="Cambiar tu propio rol"
        text="Estás cambiando el rol de tu propia cuenta. Esto podría afectar tu acceso. ¿Deseas continuar?"
        confirmText="Continuar"
        confirmVariant="warning"
        onConfirm={confirmChangeOwnRole}
      />
      <ConfirmModal
        id="toggleUserStatusModal"
        title={statusTarget?.nextStatus ? 'Activar cuenta' : 'Desactivar cuenta'}
        text={statusTarget
          ? statusTarget.nextStatus
            ? `¿Activar la cuenta de ${statusTarget.user.username}?`
            : `¿Desactivar la cuenta de ${statusTarget.user.username}?`
          : ''}
        confirmText={statusTarget?.nextStatus ? 'Activar' : 'Desactivar'}
        confirmVariant={statusTarget?.nextStatus ? 'success' : 'warning'}
        onConfirm={confirmToggleStatus}
      />
    </div>
  );
}
