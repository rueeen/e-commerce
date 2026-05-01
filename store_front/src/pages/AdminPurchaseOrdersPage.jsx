import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from '../components/ProductAutocomplete';

const emptyForm = { supplier: '', order_number: '', notes: '', shipping_clp: '', import_fees_clp: '', taxes_clp: '', status: 'DRAFT', update_prices_on_receive: false, items: [] };

export default function AdminPurchaseOrdersPage() {
  const [search] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const [{ data: od }, { data: sd }, { data: pd }] = await Promise.all([api.getPurchaseOrders(), api.getSuppliers(), api.getProducts()]);
    setOrders(od.results || od || []);
    setSuppliers(sd.results || sd || []);
    setProducts(pd.results || pd || []);
  };

  useEffect(() => { load(); }, []);

  const fetchSuggested = async (idx, unitCost) => {
    const item = form.items[idx];
    if (!item?.product) return;
    try {
      const { data } = await api.productSuggestedPrice(item.product, Number(unitCost || 0));
      setForm((f) => ({ ...f, items: f.items.map((row, i) => (i === idx ? { ...row, suggested: data } : row)) }));
    } catch {
      setForm((f) => ({ ...f, items: f.items.map((row, i) => (i === idx ? { ...row, suggested: null } : row)) }));
    }
  };

  useEffect(() => {
    const preProduct = Number(search.get('product_id'));
    if (preProduct) {
      const p = products.find((it) => it.id === preProduct);
      if (p && !form.items.some((it) => it.product === p.id)) {
        setShowForm(true);
        setForm((f) => ({ ...f, items: [...f.items, { product: p.id, name: p.name, quantity_ordered: '1', unit_cost_clp: p.last_purchase_cost_clp ? String(p.last_purchase_cost_clp) : '', current_price: p.price_clp_final || 0, suggested: null }] }));
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
    const idx = form.items.length;
    const unitCost = p.last_purchase_cost_clp ? String(p.last_purchase_cost_clp) : '';
    setForm((f) => ({ ...f, items: [...f.items, { product: p.id, name: p.name, quantity_ordered: '1', unit_cost_clp: unitCost, current_price: p.price_clp_final || 0, suggested: null }] }));
    setTimeout(() => fetchSuggested(idx, unitCost), 0);
  };

  const save = async (status) => {
    if (isSaving) return;
    if (!form.supplier || form.items.length === 0) return notyf.error('Proveedor e items son obligatorios');
    if (form.order_number && !form.order_number.trim()) return notyf.error('El número de orden no puede estar vacío.');
    if (!form.items.every((it) => Number(it.quantity_ordered || 0) > 0)) return notyf.error('La cantidad de cada item debe ser mayor a 0.');
    if (!form.items.every((it) => Number(it.unit_cost_clp || 0) >= 0)) return notyf.error('El costo unitario debe ser mayor o igual a 0.');
    try {
      setIsSaving(true);
      await api.createPurchaseOrder({
        ...form,
        order_number: form.order_number?.trim() || '',
        supplier: Number(form.supplier),
        status,
        shipping_clp: Number(form.shipping_clp || 0),
        import_fees_clp: Number(form.import_fees_clp || 0),
        taxes_clp: Number(form.taxes_clp || 0),
        items: form.items.map((it) => ({ product: it.product, quantity_ordered: Number(it.quantity_ordered || 0), unit_cost_clp: Number(it.unit_cost_clp || 0), quantity_received: 0 })),
      });
      notyf.success(`Orden ${status === 'DRAFT' ? 'guardada como borrador' : 'enviada'}`);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      notyf.error('No se pudo crear la orden');
    } finally {
      setIsSaving(false);
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
        <div className="col-md-4"><label className="form-label">Proveedor</label><select className="form-select" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Seleccione proveedor</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label">Número de orden (opcional)</label><input className="form-control" placeholder="PO-20260501-0001" value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} /></div>
        <div className="col-md-4"><label className="form-label">Notas</label><input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <label className="form-label">Agregar productos</label>
      <ProductAutocomplete products={products} onSelect={addItem} placeholder="Buscar por nombre de producto..." />
      <table className="table table-sm mt-3"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th><th>Precio sugerido</th><th>Acciones</th></tr></thead><tbody>{form.items.map((it, idx) => <tr key={it.product}><td>{it.name}</td><td><input type="number" min="1" className="form-control" placeholder="0" value={it.quantity_ordered} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((row, i) => i === idx ? { ...row, quantity_ordered: e.target.value } : row) }))} /></td><td><input type="number" min="0" className="form-control" placeholder="0" value={it.unit_cost_clp} onChange={(e) => {
        const v = e.target.value;
        setForm((f) => ({ ...f, items: f.items.map((row, i) => i === idx ? { ...row, unit_cost_clp: v } : row) }));
        fetchSuggested(idx, v);
      }} /></td><td>${Number(it.quantity_ordered || 0) * Number(it.unit_cost_clp || 0)}</td><td>{it.suggested ? <div><strong className="text-success">${it.suggested.suggested_price_clp}</strong><div className="small text-muted">Scryfall USD: {it.suggested.scryfall_usd || 'N/D'} · Dólar tienda: {it.suggested.usd_to_clp_store} · Margen aplicado</div>{!it.suggested.has_scryfall_price ? <div className="small text-warning">Sin precio Scryfall</div> : null}{it.current_price > 0 && it.suggested.min_price_clp > 0 && it.current_price < it.suggested.min_price_clp ? <div className="small text-danger">Precio actual bajo margen mínimo</div> : null}</div> : <span className="text-muted">—</span>}</td><td><div className="d-flex gap-2"><button className="btn btn-outline-success btn-sm" onClick={async () => {
        if (!it.suggested?.suggested_price_clp) {
          notyf.error('No hay precio sugerido para este producto.');
          return;
        }
        if (!window.confirm(`¿Actualizar precio de venta de este producto a $${it.suggested.suggested_price_clp}?`)) return;
        try {
          await api.patchProduct(it.product, { price_clp_final: it.suggested.suggested_price_clp });
          setForm((f) => ({ ...f, items: f.items.map((row, i) => i === idx ? { ...row, current_price: it.suggested.suggested_price_clp } : row) }));
          notyf.success('Precio de venta actualizado');
        } catch {
          notyf.error('No se pudo actualizar el precio de venta.');
        }
      }}>Usar precio sugerido</button><button className="btn btn-outline-danger btn-sm" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>Eliminar</button></div></td></tr>)}</tbody></table>
      <div className="form-check mb-2"><input className="form-check-input" type="checkbox" id="update-prices-on-receive" checked={form.update_prices_on_receive} onChange={(e) => setForm({ ...form, update_prices_on_receive: e.target.checked })} /><label className="form-check-label" htmlFor="update-prices-on-receive">Actualizar precios de venta al recibir orden</label></div>
      <div className="row g-2 mt-2"><div className="col-md-2"><label className="form-label">Costo envío</label><input type="number" className="form-control" placeholder="0" value={form.shipping_clp} onChange={(e) => setForm({ ...form, shipping_clp: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Importación</label><input type="number" className="form-control" placeholder="0" value={form.import_fees_clp} onChange={(e) => setForm({ ...form, import_fees_clp: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Impuestos</label><input type="number" className="form-control" placeholder="0" value={form.taxes_clp} onChange={(e) => setForm({ ...form, taxes_clp: e.target.value })} /></div><div className="col-md-6"><div className="alert alert-light border mt-4 mb-0">Subtotal: ${subtotal} | Total final: <strong>${total}</strong></div></div></div>
      <div className="d-flex gap-2 mt-3"><button className="btn btn-outline-secondary" disabled={isSaving} onClick={() => save('DRAFT')}>{isSaving ? 'Guardando orden...' : 'Guardar borrador'}</button><button className="btn btn-success" disabled={isSaving} onClick={() => save('SENT')}>{isSaving ? 'Guardando orden...' : 'Guardar y enviar'}</button></div>
    </div> : null}

    <table className="table"><thead><tr><th>Número</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td>{o.order_number}</td><td>{o.supplier_name || o.supplier}</td><td><span className="badge text-bg-secondary">{o.status}</span></td><td>${o.total_clp}</td><td>{new Date(o.created_at).toLocaleDateString('es-CL')}</td><td className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={() => window.alert(`Detalle: ${o.order_number}`)}>Ver detalle</button>{o.status !== 'RECEIVED' ? <button className="btn btn-sm btn-success" onClick={() => receive(o.id)}>Marcar como recibida</button> : null}</td></tr>)}</tbody></table>
  </div>;
}
