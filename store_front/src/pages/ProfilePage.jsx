import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="card p-4 shadow-sm">
      <h2>Perfil</h2>
      <p><strong>Usuario:</strong> {user?.username || '-'}</p>
      <p><strong>Email:</strong> {user?.email || '-'}</p>
      <p><strong>Rol:</strong> {user?.is_staff ? 'Administrador' : 'Cliente'}</p>
    </div>
  );
}
