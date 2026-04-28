import { useEffect, useMemo, useRef, useState } from 'react';
import DataTable from 'datatables.net-bs5';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initialForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '',
  product_type: 'physical',
  is_active: true,
  featured: false,
  image: null,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [excelFile, setExcelFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importEndpointAvailable, setImportEndpointAvailable] = useState(true);
  const [templateEndpointAvailable, setTemplateEndpointAvailable] = useState(true);
  const tableRef = useRef(null);

  const load = async () => {
    const [{ data: productData }, { data: categoryData }] = await Promise.all([api.products(), api.categories()]);
    setProducts(productData.results || productData);
    setCategories(categoryData.results || categoryData);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const dt = new DataTable(tableRef.current, { destroy: true, paging: true, searching: true, order: [[0, 'desc']] });
    return () => dt.destroy();
  }, [products]);

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [String(c.id), c.name])), [categories]);

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toPayload = () => {
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', Number(form.price || 0));
    formData.append('stock', Number(form.stock || 0));
    formData.append('product_type', form.product_type);
    formData.append('is_active', form.is_active);
    formData.append('featured', form.featured);
    formData.append('category', form.category || '');
    if (form.image instanceof File) formData.append('image', form.image);
    return formData;
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = toPayload();
      if (editing) {
        await api.adminEditProduct(editing.id, payload, true);
        notyf.success('Producto actualizado correctamente');
      } else {
        await api.adminCreateProduct(payload, true);
        notyf.success('Producto creado correctamente');
      }
      setForm(initialForm);
      setEditing(null);
      await load();
    } catch {
      notyf.error('Error al guardar producto');
    }
  };

  const toggleActive = async (p) => {
    await api.adminPatchProduct(p.id, { is_active: !p.is_active });
    notyf.success('Producto desactivado correctamente');
    load();
  };

  const removeProduct = async (p) => {
    try {
      await api.adminDeleteProduct(p.id);
      notyf.success('Producto eliminado correctamente');
      load();
    } catch {
      notyf.error('El backend no permite eliminar este producto');
    }
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ ...initialForm, ...p, category: String(p.category?.id || p.category || ''), image: null, featured: Boolean(p.featured) });
  };

  const importExcel = async () => {
    if (!excelFile) return;
    try {
      const { data } = await api.importProductsExcel(excelFile);
      setImportResult(data);
      notyf.success('Excel importado correctamente');
      setImportEndpointAvailable(true);
      load();
    } catch (error) {
      if (error.response?.status === 404) {
        setImportEndpointAvailable(false);
        setImportResult({ expected_endpoint: 'POST /api/products/import-excel/' });
      } else {
        notyf.error('Errores en filas del Excel');
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.importTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_productos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTemplateEndpointAvailable(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setTemplateEndpointAvailable(false);
      }
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Mantenedor de productos</h2>
        <button className="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#excelModal"><i className="bi bi-file-earmark-arrow-up me-1" /> Importar Excel</button>
      </div>

      <form className="card p-3 mb-4" onSubmit={submit}>
        <h5>{editing ? 'Editar producto' : 'Crear producto'}</h5>
        <div className="row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => onChange('name', e.target.value)} required /></div>
          <div className="col-md-4"><input className="form-control" type="number" min="0" step="0.01" placeholder="Precio" value={form.price} onChange={(e) => onChange('price', e.target.value)} required /></div>
          <div className="col-md-4"><input className="form-control" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => onChange('stock', e.target.value)} /></div>
          <div className="col-md-6"><textarea className="form-control" placeholder="Descripción" value={form.description} onChange={(e) => onChange('description', e.target.value)} rows="3" required /></div>
          <div className="col-md-3"><select className="form-select" value={form.category} onChange={(e) => onChange('category', e.target.value)} required><option value="">Categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="col-md-3"><select className="form-select" value={form.product_type} onChange={(e) => onChange('product_type', e.target.value)}><option value="physical">Físico</option><option value="digital">Digital</option></select></div>
          <div className="col-md-4"><input className="form-control" type="file" accept="image/*" onChange={(e) => onChange('image', e.target.files?.[0] || null)} /></div>
          <div className="col-md-8 d-flex gap-4 align-items-center">
            <div className="form-check"><input id="active" className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => onChange('is_active', e.target.checked)} /><label htmlFor="active" className="form-check-label">Activo</label></div>
            <div className="form-check"><input id="featured" className="form-check-input" type="checkbox" checked={form.featured} onChange={(e) => onChange('featured', e.target.checked)} /><label htmlFor="featured" className="form-check-label">Destacado</label></div>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary">{editing ? 'Actualizar producto' : 'Crear producto'}</button>
            {editing ? <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditing(null); setForm(initialForm); }}>Cancelar edición</button> : null}
          </div>
        </div>
      </form>

      <table ref={tableRef} className="table table-striped align-middle">
        <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.name}</td><td>{p.category?.name || categoryMap[String(p.category)] || '-'}</td><td>{p.product_type}</td><td>${p.price}</td><td>{p.stock ?? '-'}</td><td><span className={`badge ${p.is_active ? 'text-bg-success' : 'text-bg-secondary'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
              <td className="d-flex gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(p)}><i className="bi bi-pencil" /></button>
                <button className="btn btn-outline-warning btn-sm" onClick={() => toggleActive(p)}><i className="bi bi-power" /></button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => removeProduct(p)}><i className="bi bi-trash" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="modal fade" id="excelModal" tabIndex="-1" aria-hidden="true"><div className="modal-dialog"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Importar productos por Excel</h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div><div className="modal-body">
        <p className="small mb-2">Columnas esperadas: <code>nombre, descripcion, precio, stock, categoria, tipo_producto, activo, imagen_url(opcional)</code></p>
        <div className="d-flex gap-2 mb-3"><input className="form-control" type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} /><button className="btn btn-primary" type="button" onClick={importExcel}>Enviar</button></div>
        <button className="btn btn-outline-secondary btn-sm mb-2" type="button" onClick={downloadTemplate}><i className="bi bi-download me-1" /> Descargar plantilla</button>
        {!templateEndpointAvailable ? <p className="small text-muted">Endpoint esperado para plantilla: <code>GET /api/products/import-template/</code></p> : null}
        {!importEndpointAvailable ? <p className="small text-muted">Endpoint esperado para importación: <code>POST /api/products/import-excel/</code></p> : null}
        {importResult ? <pre className="bg-light p-2 rounded small">{JSON.stringify(importResult, null, 2)}</pre> : null}
      </div></div></div></div>
    </>
  );
}
