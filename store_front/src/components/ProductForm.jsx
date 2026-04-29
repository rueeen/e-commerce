const initialFormState = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category_id: '',
  product_type: 'physical',
  is_active: true,
  image: '',
};

export { initialFormState };

export default function ProductForm({ form, categories, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <form className="panel-card p-3" onSubmit={onSubmit}>
      <div className="row g-2">
        <div className="col-md-4"><input className="form-control" placeholder="Nombre" value={form.name} onChange={(e) => onChange('name', e.target.value)} required /></div>
        <div className="col-md-4"><input className="form-control" type="number" min="0" step="0.01" placeholder="Precio" value={form.price} onChange={(e) => onChange('price', e.target.value)} required /></div>
        <div className="col-md-4"><input className="form-control" type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => onChange('stock', e.target.value)} required /></div>
        <div className="col-md-6"><textarea className="form-control" rows="3" placeholder="Descripción" value={form.description} onChange={(e) => onChange('description', e.target.value)} /></div>
        <div className="col-md-3"><select className="form-select" value={form.category_id} onChange={(e) => onChange('category_id', e.target.value)} required><option value="">Categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-md-3"><select className="form-select" value={form.product_type} onChange={(e) => onChange('product_type', e.target.value)}><option value="physical">Físico</option><option value="digital">Digital</option></select></div>
        <div className="col-md-8"><input className="form-control" placeholder="URL imagen (opcional)" value={form.image} onChange={(e) => onChange('image', e.target.value)} /></div>
        <div className="col-md-4 d-flex align-items-center"><div className="form-check"><input id="active-product" className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => onChange('is_active', e.target.checked)} /><label htmlFor="active-product" className="form-check-label">Activo</label></div></div>
        <div className="col-12 d-flex gap-2"><button className="btn btn-primary">{submitLabel}</button>{onCancel ? <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancelar</button> : null}</div>
      </div>
    </form>
  );
}
