import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from '../components/ProductAutocomplete';

const movementTypes = ['IN', 'OUT', 'ADJUSTMENT', 'SALE', 'RETURN', 'CORRECTION', 'PURCHASE_IN'];

export default function AdminKardexPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filters, setFilters] = useState({ product_id: '', movement_type: '', date: '' });
  const [form, setForm] = useState({ movement_type: 'ADJUSTMENT', quantity: 1, reference: '', notes: '' });

  const load = async () => {
    const { data } = await api.getKardex(filters);
    setMovements(data || []);
  };

  useEffect(() => { api.getProducts().then(({ data }) => setProducts(data.results || data || [])); }, []);
  useEffect(() => { load(); }, [filters.product_id, filters.movement_type, filters.date]);

  const filtered = useMemo(() => movements.filter((m) => !filters.date || String(m.created_at || '').slice(0, 10) === filters.date), [movements, filters.date]);

  return <div className="panel-card p-3"><h2>Kardex</h2>
    <div className="row g-2 mb-3"><div className="col-md-4"><ProductAutocomplete products={products} placeholder="Buscar producto..." onSelect={(p) => setFilters((f) => ({ ...f, product_id: String(p.id) }))} selectedLabel={products.find((p) => String(p.id) === filters.product_id)?.name} /></div><div className="col-md-3"><select className="form-select" value={filters.movement_type} onChange={(e) => setFilters({ ...filters, movement_type: e.target.value })}><option value="">Todos los tipos</option>{movementTypes.map((t) => <option key={t}>{t}</option>)}</select></div><div className="col-md-3"><input type="date" className="form-control" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></div><div className="col-md-2"><button className="btn btn-primary w-100" onClick={load}>Filtrar</button></div></div>

    <h5>Nuevo movimiento manual</h5>
    <div className="alert alert-warning py-2">Los movimientos manuales deben usarse solo en casos excepcionales.</div>
    <div className="row g-2 mb-2"><div className="col-md-4"><ProductAutocomplete products={products} placeholder="Buscar producto para movimiento..." onSelect={setSelectedProduct} selectedLabel={selectedProduct?.name} /></div><div className="col-md-2"><select className="form-select" value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>{movementTypes.map((t) => <option key={t}>{t}</option>)}</select></div><div className="col-md-2"><input type="number" min="1" className="form-control" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div><div className="col-md-2"><input type="text" className="form-control" placeholder="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div><div className="col-md-2"><button className="btn btn-success w-100" onClick={async () => { if (!selectedProduct) return notyf.error('Selecciona un producto'); try { await api.createKardexMovement({ ...form, product: Number(selectedProduct.id) }); notyf.success('Movimiento creado'); load(); } catch (e) { notyf.error(e?.response?.data?.detail || 'Error'); } }}>Registrar</button></div></div>
    {selectedProduct ? <div className="mb-3 small text-muted">Stock actual: {selectedProduct.stock} | Costo promedio: ${selectedProduct.average_cost_clp || 0}</div> : null}

    <table className="table table-sm"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant</th><th>Stock ant</th><th>Stock nuevo</th><th>Ref</th></tr></thead><tbody>{filtered.map((m) => <tr key={m.id}><td>{new Date(m.created_at).toLocaleString('es-CL')}</td><td>{m.producto}</td><td>{m.movement_type}</td><td>{m.quantity}</td><td>{m.previous_stock}</td><td>{m.new_stock}</td><td>{m.reference_display || m.reference}</td></tr>)}</tbody></table>
  </div>;
}
