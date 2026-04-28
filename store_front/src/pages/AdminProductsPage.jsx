import { useEffect, useRef, useState } from 'react';
import DataTable from 'datatables.net-bs5';
import { api } from '../api/endpoints';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, stock: 0, product_type: 'physical', is_active: true });
  const tableRef = useRef(null);

  const load = () => api.products().then(({ data }) => setProducts(data.results || data));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const dt = new DataTable(tableRef.current, { destroy: true, paging: true, searching: true });
    return () => dt.destroy();
  }, [products]);

  const submit = async (e) => {
    e.preventDefault();
    if (editing) {
      await api.adminEditProduct(editing.id, form);
    } else {
      await api.adminCreateProduct(form);
    }
    setForm({ name: '', description: '', price: 0, stock: 0, product_type: 'physical', is_active: true });
    setEditing(null);
    load();
  };

  const toggleActive = async (p) => {
    await api.adminToggleProduct(p.id, { is_active: !p.is_active });
    load();
  };

  return (
    <>
      <h2>Administrar productos</h2>
      <form className="row g-2 mb-4" onSubmit={submit}>
        <div className="col-md-3"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
        <div className="col-md-3"><input className="form-control" placeholder="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></div>
        <div className="col-md-2"><input className="form-control" type="number" placeholder="Precio" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required /></div>
        <div className="col-md-2"><input className="form-control" type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} /></div>
        <div className="col-md-2"><button className="btn btn-primary w-100">{editing ? 'Actualizar' : 'Crear'}</button></div>
      </form>

      <table ref={tableRef} className="table table-striped">
        <thead><tr><th>ID</th><th>Nombre</th><th>Tipo</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.name}</td><td>{p.product_type}</td><td>${p.price}</td><td>{p.is_active ? 'Activo' : 'Inactivo'}</td>
              <td className="d-flex gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => { setEditing(p); setForm(p); }}><i className="bi bi-pencil" /></button>
                <button className="btn btn-outline-warning btn-sm" onClick={() => toggleActive(p)}><i className="bi bi-power" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
