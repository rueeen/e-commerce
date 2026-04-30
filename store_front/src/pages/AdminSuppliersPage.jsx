import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', is_active: true });
  const load = async () => { const { data } = await api.getSuppliers(); setSuppliers(data.results || data || []); };
  useEffect(() => { load(); }, []);
  const save = async () => { await api.createSupplier(form); setForm({ name: '', email: '', phone: '', is_active: true }); load(); };
  return <div className="panel-card p-3"><h2>Proveedores</h2><div className="row g-2 mb-3"><div className="col"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div><div className="col"><input className="form-control" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} /></div><div className="col"><button className="btn btn-primary" onClick={save}>Crear</button></div></div><table className="table"><thead><tr><th>Nombre</th><th>Email</th><th>Activo</th></tr></thead><tbody>{suppliers.map((s)=><tr key={s.id}><td>{s.name}</td><td>{s.email}</td><td>{String(s.is_active)}</td></tr>)}</tbody></table></div>;
}
