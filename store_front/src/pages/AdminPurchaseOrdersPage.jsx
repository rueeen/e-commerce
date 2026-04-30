import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';

export default function AdminPurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const load = async () => { const { data } = await api.getPurchaseOrders(); setOrders(data.results || data || []); };
  useEffect(() => { load(); }, []);
  const receive = async (id) => { await api.receivePurchaseOrder(id); load(); };
  return <div className="panel-card p-3"><h2>Órdenes de compra</h2><table className="table"><thead><tr><th>Número</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>{orders.map((o)=><tr key={o.id}><td>{o.order_number}</td><td>{o.status}</td><td>{o.total_clp}</td><td>{o.status !== 'RECEIVED' ? <button className="btn btn-sm btn-success" onClick={()=>receive(o.id)}>Marcar recibida</button> : null}</td></tr>)}</tbody></table></div>;
}
