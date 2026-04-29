export default function AdminHeader({ onMenu }) {
  return <header className="admin-header"><button className="btn btn-outline-primary d-lg-none" onClick={onMenu}><i className="bi bi-list"></i></button><h1 className="h5 m-0">Panel administrativo</h1></header>;
}
