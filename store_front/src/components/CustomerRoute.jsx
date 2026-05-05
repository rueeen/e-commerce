import RoleRoute from './RoleRoute';

export default function CustomerRoute({ children }) {
  return (
    <RoleRoute allowRoles={['admin', 'worker', 'customer']}>
      {children}
    </RoleRoute>
  );
}