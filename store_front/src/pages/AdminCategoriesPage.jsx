import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initialState = { name: '', slug: '', description: '', is_active: true };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialState);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const { data } = await api.getCategories();
    setItems(data.results || data);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return notyf.error('Nombre y slug son obligatorios');
    if (editingId) await api.updateCategory(editingId, form); else await api.createCategory(form);
    setEditingId(null); setForm(initialState); load();
  };

  return <div className="panel-card p-3">
    <h2 className="mb-3">Categorías</h2>
    <form className="row g-2" onSubmit={submit}>
      <div className="col-md-3"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="col-md-3"><input className="form-control" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
      <div className="col-md-4"><input className="form-control" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="col-md-2 d-grid"><button className="btn btn-primary">{editingId ? 'Actualizar' : 'Crear'}</button></div>
    </form>
    <table className="table mt-3"><thead><tr><th>Nombre</th><th>Slug</th><th>Productos</th><th>Estado</th><th></th></tr></thead><tbody>{items.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.slug}</td><td>{c.products_count ?? '-'}</td><td>{c.is_active ? 'Activa' : 'Inactiva'}</td><td><button className="btn btn-sm btn-outline-primary me-2" onClick={() => { setEditingId(c.id); setForm(c); }}>Editar</button><button className="btn btn-sm btn-outline-secondary" onClick={() => api.patchCategory(c.id, { is_active: !c.is_active }).then(load)}>{c.is_active ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table>
  </div>;
}
