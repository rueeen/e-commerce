import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from '../components/ProductAutocomplete';

const emptyForm = { supplier: '', notes: '', shipping_clp: 0, import_fees_clp: 0, taxes_clp: 0, status: 'DRAFT', items: [] };

export default function AdminPurchaseOrdersPage() {
  const [search] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [{ data: od }, { data: sd }, { data: pd }] = await Promise.all([api.getPurchaseOrders(), api.getSuppliers(), api.getProducts()]);
    setOrders(od.results || od || []);
    setSuppliers(sd.results || sd || []);
    setProducts(pd.results || pd || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const preProduct = Number(search.get('product_id'));
    if (preProduct) {
      const p = products.find((it) => it.id === preProduct);
      if (p && !form.items.some((it) => it.product === p.id)) {
        setShowForm(true);
        setForm((f) => ({ ...f, items: [...f.items, { product: p.id, name: p.name, quantity_ordered: 1, unit_cost_clp: p.last_purchase_cost_clp || 0 }] }));
      }
    }
  }, [search, products]);

  const subtotal = useMemo(() => form.items.reduce((acc, it) => acc + Number(it.quantity_ordered || 0) * Number(it.unit_cost_clp || 0), 0), [form.items]);
  const total = subtotal + Number(form.shipping_clp || 0) + Number(form.import_fees_clp || 0) + Number(form.taxes_clp || 0);

  const receive = async (id) => {
    const ok = window.confirm('Esto aumentará el stock y generará movimientos Kardex. ¿Deseas continuar?');
    if (!ok) return;
    await api.receivePurchaseOrder(id);
    notyf.success('Orden marcada como recibida');
    load();
  };

  const addItem = (p) => {
    if (form.items.some((it) => it.product === p.id)) return;
    setForm((f) => ({ ...f, items: [...f.items, { product: p.id, name: p.name, quantity_ordered: 1, unit_cost_clp: p.last_purchase_cost_clp || 0 }] }));
  };

  const save = async (status) => {
    if (!form.supplier || form.items.length === 0) return notyf.error('Proveedor e items son obligatorios');
    try {
      await api.createPurchaseOrder({
        ...form,
        supplier: Number(form.supplier),
        status,
        items: form.items.map((it) => ({ product: it.product, quantity_ordered: Number(it.quantity_ordered), unit_cost_clp: Number(it.unit_cost_clp), quantity_received: 0 })),
      });
      notyf.success(`Orden ${status === 'DRAFT' ? 'guardada como borrador' : 'enviada'}`);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      notyf.error('No se pudo crear la orden');
    }
  };

  return <div className="panel-card p-3">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h2 className="mb-0">Órdenes de compra</h2>
      <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>+ Nueva orden de compra</button>
    </div>

    {showForm ? <div className="card card-body mb-4">
      <h5>Nueva orden de compra</h5>
      <div className="row g-2 mb-3">
        <div className="col-md-6"><label className="form-label">Proveedor</label><select className="form-select" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Seleccione proveedor</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label">Notas</label><input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <label className="form-label">Agregar productos</label>
      <ProductAutocomplete products={products} onSelect={addItem} placeholder="Buscar por nombre de producto..." />
      <table className="table table-sm mt-3"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th><th></th></tr></thead><tbody>{form.items.map((it, idx) => <tr key={it.product}><td>{it.name}</td><td><input type="number" min="1" className="form-control" value={it.quantity_ordered} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((row, i) => i === idx ? { ...row, quantity_ordered: Number(e.target.value) } : row) }))} /></td><td><input type="number" min="0" className="form-control" value={it.unit_cost_clp} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((row, i) => i === idx ? { ...row, unit_cost_clp: Number(e.target.value) } : row) }))} /></td><td>${Number(it.quantity_ordered || 0) * Number(it.unit_cost_clp || 0)}</td><td><button className="btn btn-outline-danger btn-sm" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>Eliminar</button></td></tr>)}</tbody></table>
      <div className="row g-2 mt-2"><div className="col-md-2"><label className="form-label">Costo envío</label><input type="number" className="form-control" value={form.shipping_clp} onChange={(e) => setForm({ ...form, shipping_clp: Number(e.target.value) })} /></div><div className="col-md-2"><label className="form-label">Importación</label><input type="number" className="form-control" value={form.import_fees_clp} onChange={(e) => setForm({ ...form, import_fees_clp: Number(e.target.value) })} /></div><div className="col-md-2"><label className="form-label">Impuestos</label><input type="number" className="form-control" value={form.taxes_clp} onChange={(e) => setForm({ ...form, taxes_clp: Number(e.target.value) })} /></div><div className="col-md-6"><div className="alert alert-light border mt-4 mb-0">Subtotal: ${subtotal} | Total final: <strong>${total}</strong></div></div></div>
      <div className="d-flex gap-2 mt-3"><button className="btn btn-outline-secondary" onClick={() => save('DRAFT')}>Guardar borrador</button><button className="btn btn-success" onClick={() => save('SENT')}>Guardar y enviar</button></div>
    </div> : null}

    <table className="table"><thead><tr><th>Número</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td>{o.order_number}</td><td>{o.supplier_name || o.supplier}</td><td><span className="badge text-bg-secondary">{o.status}</span></td><td>${o.total_clp}</td><td>{new Date(o.created_at).toLocaleDateString('es-CL')}</td><td className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={() => window.alert(`Detalle: ${o.order_number}`)}>Ver detalle</button>{o.status !== 'RECEIVED' ? <button className="btn btn-sm btn-success" onClick={() => receive(o.id)}>Marcar como recibida</button> : null}</td></tr>)}</tbody></table>
  </div>;
}
