import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ExcelImportBox from '../components/ExcelImportBox';
import ProductForm, { initialFormState } from '../components/ProductForm';
import ProductTable from '../components/ProductTable';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [importResult, setImportResult] = useState(null);
  const [filters, setFilters] = useState({ q: '', category: '', type: '', active: '' });

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([api.getProducts(), api.getCategories()]);
    setProducts(p.results || p);
    setCategories(c.results || c);
  };

  useEffect(() => { load(); }, []);
  const onChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), category_id: Number(form.category_id) };
      if (editing) await api.updateProduct(editing.id, payload); else await api.createProduct(payload);
      notyf.success(editing ? 'Producto actualizado' : 'Producto creado');
      setEditing(null); setForm(initialFormState); load();
    } catch { notyf.error('No fue posible guardar el producto'); }
  };

  const onEdit = (p) => {
    setEditing(p);
    setForm({ ...initialFormState, ...p, category_id: String(p.category?.id || '') });
  };

  const onImport = async (file) => {
    try {
      const { data } = await api.importProductsExcel(file);
      setImportResult(data);
      notyf.success('Importación completada');
      load();
    } catch { notyf.error('Falló la importación del archivo'); }
  };

  const filtered = useMemo(() => products.filter((p) => {
    const matchQ = p.name.toLowerCase().includes(filters.q.toLowerCase());
    const matchC = !filters.category || String(p.category?.id) === filters.category;
    const matchT = !filters.type || p.product_type === filters.type;
    const matchA = !filters.active || String(p.is_active) === filters.active;
    return matchQ && matchC && matchT && matchA;
  }), [products, filters]);

  return (<>
    <h2 className="mb-3">Mantenedor de productos</h2>
    <ExcelImportBox onImport={onImport} result={importResult} />
    <ProductForm form={form} categories={categories} onChange={onChange} onSubmit={submit} submitLabel={editing ? 'Actualizar producto' : 'Crear producto'} onCancel={editing ? () => { setEditing(null); setForm(initialFormState); } : null} />
    <div className="card p-3 mt-4">
      <div className="row g-2 mb-3">
        <div className="col-md-4"><input className="form-control" placeholder="Buscar por nombre" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} /></div>
        <div className="col-md-3"><select className="form-select" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}><option value="">Todas las categorías</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}><option value="">Todos los tipos</option><option value="physical">Físico</option><option value="digital">Digital</option></select></div>
        <div className="col-md-2"><select className="form-select" value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value }))}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></div>
      </div>
      <ProductTable products={filtered} onEdit={onEdit} onToggleActive={(p) => api.patchProduct(p.id, { is_active: !p.is_active }).then(load)} onDelete={(p) => api.deleteProduct(p.id).then(load)} />
    </div>
  </>);
}
