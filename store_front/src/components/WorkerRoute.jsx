import RoleRoute from './RoleRoute';

export default function WorkerRoute({ children }) {
  return (
    <RoleRoute allowRoles={['admin', 'worker']}>
      {children}
    </RoleRoute>
  );
}