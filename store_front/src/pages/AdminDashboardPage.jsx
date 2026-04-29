import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ products: 0, categories: 0, users: 0, orders: 0 });

  useEffect(() => {
    Promise.all([api.getProducts(), api.getCategories(), api.adminUsers(), api.orders()]).then(([p, c, u, o]) => {
      setStats({
        products: (p.data.results || p.data).length,
        categories: (c.data.results || c.data).length,
        users: (u.data.results || u.data).length,
        orders: (o.data.results || o.data).length,
      });
    });
  }, []);

  return <div className="row g-3">{Object.entries(stats).map(([k, v]) => <div key={k} className="col-md-3"><div className="panel-card p-3"><h6 className="text-capitalize">{k}</h6><h3>{v}</h3></div></div>)}</div>;
}
