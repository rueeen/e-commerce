import RoleRoute from './RoleRoute';

export default function AdminRoute({ children }) {
  return <RoleRoute allowRoles={["admin"]}>{children}</RoleRoute>;
}
