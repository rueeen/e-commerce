import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';

const statuses = ['pending', 'processing', 'paid', 'cancelled', 'completed'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const load = () => api.orders().then(({ data }) => setOrders(data.results || data));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => orders.filter((o) => {
    const text = `${o.id} ${o.user?.username || ''}`.toLowerCase();
    return text.includes(q.toLowerCase()) && (!status || o.status === status);
  }), [orders, q, status]);

  return <div className="panel-card p-3"><h2>Pedidos</h2>
    <div className="row g-2 mb-3"><div className="col-md-4"><input className="form-control" placeholder="Buscar por usuario o pedido" value={q} onChange={(e) => setQ(e.target.value)} /></div><div className="col-md-3"><select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option>{statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
    <table className="table"><thead><tr><th>#</th><th>Usuario</th><th>Estado</th><th>Total CLP</th><th>Acciones</th></tr></thead><tbody>{filtered.map((o) => <tr key={o.id}><td>{o.id}</td><td>{o.user?.username || o.user}</td><td>{o.status}</td><td>{o.total_clp || '-'}</td><td><select className="form-select form-select-sm" value={o.status} onChange={(e) => api.updateOrderStatus(o.id, e.target.value).then(load)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>
  </div>;
}
