import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  const roleLabel = { admin: 'Administrador', worker: 'Trabajador', customer: 'Cliente' }[user?.role] || 'Cliente';

  return (
    <div className="card p-4 shadow-sm">
      <h2>Perfil</h2>
      <p><strong>Usuario:</strong> {user?.username || '-'}</p>
      <p><strong>Email:</strong> {user?.email || '-'}</p>
      <p><strong>Rol:</strong> {roleLabel}</p>
    </div>
  );
}
