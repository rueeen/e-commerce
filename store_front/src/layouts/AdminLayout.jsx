import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-layout">
      <AdminSidebar
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="admin-main">
        <AdminHeader onMenu={() => setOpen((current) => !current)} />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}