import { useAuth } from '../hooks/useAuth';

const roleLabels = {
  admin: 'Administrador',
  worker: 'Trabajador',
  customer: 'Cliente',
};

const roleBadgeClass = {
  admin: 'badge-warning',
  worker: 'badge-success',
  customer: 'badge-soft',
};

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="panel-card p-4 text-center text-muted">
        Cargando perfil...
      </div>
    );
  }

  const role = user.role || 'customer';
  const roleLabel = roleLabels[role] || 'Cliente';

  return (
    <div className="panel-card p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h2 className="mb-1">Mi perfil</h2>
          <p className="text-muted mb-0">
            Información básica de tu cuenta.
          </p>
        </div>

        <span className={`badge ${roleBadgeClass[role] || 'badge-soft'}`}>
          {roleLabel}
        </span>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="panel-card p-3 h-100">
            <span className="text-muted small">Usuario</span>
            <div className="fs-5">{user.username || '-'}</div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="panel-card p-3 h-100">
            <span className="text-muted small">Email</span>
            <div className="fs-5">{user.email || '-'}</div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="panel-card p-3 h-100">
            <span className="text-muted small">Nombre</span>
            <div className="fs-5">
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="panel-card p-3 h-100">
            <span className="text-muted small">Rol</span>
            <div className="fs-5">{roleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}