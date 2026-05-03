import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const extraCostFields = [
  { key: 'import_duties_clp', label: 'Derechos de importación (CLP)' },
  { key: 'customs_fee_clp', label: 'Aduana (CLP)' },
  { key: 'handling_fee_clp', label: 'Manejo (CLP)' },
  { key: 'paypal_variation_clp', label: 'Variación pasarela/pago (CLP)' },
  { key: 'other_costs_clp', label: 'Otros costos (CLP)' },
];

export default function PurchaseOrderImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [sourceStore, setSourceStore] = useState('Card Kingdom');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatePricesOnReceive, setUpdatePricesOnReceive] = useState(false);
  const [extraCosts, setExtraCosts] = useState({ import_duties_clp: '', customs_fee_clp: '', handling_fee_clp: '', paypal_variation_clp: '', other_costs_clp: '' });

  useEffect(() => {
    api.getSuppliers().then(({ data }) => setSuppliers(data.results || data || [])).catch(() => notyf.error('No se pudieron cargar los proveedores'));
  }, []);

  const totals = preview?.totals || {};
  const canCreate = useMemo(() => Boolean(preview && file && (supplierId || supplierName.trim())), [preview, file, supplierId, supplierName]);

  const handlePreview = async () => {
    if (!file) return notyf.error('Selecciona un archivo .xlsx');
    if (!supplierId && !supplierName.trim()) return notyf.error('Selecciona un proveedor o ingresa uno nuevo');
    setLoadingPreview(true);
    setPreview(null);
    try {
      const { data } = await api.purchaseOrderImportPreview({ file, supplier_id: supplierId || undefined, source_store: sourceStore, supplier_name: supplierId ? undefined : supplierName.trim() });
      setPreview(data);
      notyf.success('Previsualización lista');
    } catch (error) {
      notyf.error(error?.response?.data?.detail || 'No se pudo previsualizar el archivo');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const { data } = await api.purchaseOrderImportCreate({
        file,
        supplier_id: supplierId || undefined,
        supplier_name: supplierId ? undefined : supplierName.trim(),
        source_store: sourceStore,
        update_prices_on_receive: updatePricesOnReceive,
        ...Object.fromEntries(Object.entries(extraCosts).map(([key, value]) => [key, Number(value || 0)])),
      });
      notyf.success(`Orden importada (${data.order_number})`);
      navigate('/admin/purchase-orders');
    } catch (error) {
      notyf.error(error?.response?.data?.detail || 'No se pudo crear la orden importada');
    } finally {
      setCreating(false);
    }
  };

  return <div className="panel-card p-3">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h2 className="mb-0">Importar orden desde Excel</h2>
      <Link to="/admin/purchase-orders" className="btn btn-outline-secondary">Volver</Link>
    </div>

    <div className="card card-body mb-3">
      <h5>1) Archivo y proveedor</h5>
      <div className="row g-2">
        <div className="col-md-4"><label className="form-label">Archivo (.xlsx)</label><input type="file" accept=".xlsx" className="form-control" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        <div className="col-md-4"><label className="form-label">Proveedor</label><select className="form-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Seleccionar proveedor existente</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label">Nuevo proveedor (opcional)</label><input className="form-control" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Se usa si no eliges proveedor" /></div>
        <div className="col-md-4"><label className="form-label">Tienda origen</label><input className="form-control" value={sourceStore} onChange={(e) => setSourceStore(e.target.value)} /></div>
      </div>
      <div className="mt-3"><button className="btn btn-primary" disabled={loadingPreview} onClick={handlePreview}>{loadingPreview ? 'Previsualizando...' : 'Previsualizar'}</button></div>
    </div>

    {preview ? <div className="card card-body mb-3">
      <h5>2) Preview</h5>
      <div className="row mb-2">
        <div className="col-md-3"><strong>Moneda:</strong> {preview.currency}</div>
        <div className="col-md-3"><strong>Ítems:</strong> {preview.items?.length || 0}</div>
        <div className="col-md-6"><strong>Warnings:</strong> {(preview.warnings || []).length}</div>
      </div>
      <div className="alert alert-light border">
        Subtotal: {totals.subtotal_original} · Envío: {totals.shipping_original} · Impuestos: {totals.sales_tax_original} · <strong>Total: {totals.total_original}</strong>
      </div>
      <div className="table-responsive" style={{ maxHeight: 320 }}>
        <table className="table table-sm table-striped"><thead><tr><th>Carta</th><th>Set</th><th>Condición</th><th>Cantidad</th><th>Precio unitario</th><th>Total línea</th></tr></thead><tbody>{(preview.items || []).map((item, idx) => <tr key={idx}><td>{item.normalized_card_name || item.raw_description}</td><td>{item.set_name_detected || '—'}</td><td>{item.style_condition}</td><td>{item.quantity_ordered}</td><td>{item.unit_price_original}</td><td>{item.line_total_original}</td></tr>)}</tbody></table>
      </div>
    </div> : null}

    {preview ? <div className="card card-body">
      <h5>3) Confirmación</h5>
      <div className="row g-2 mb-2">{extraCostFields.map((field) => <div className="col-md-4" key={field.key}><label className="form-label">{field.label}</label><input type="number" min="0" className="form-control" value={extraCosts[field.key]} onChange={(e) => setExtraCosts((prev) => ({ ...prev, [field.key]: e.target.value }))} /></div>)}</div>
      <div className="form-check mb-3"><input id="update-prices-import" type="checkbox" className="form-check-input" checked={updatePricesOnReceive} onChange={(e) => setUpdatePricesOnReceive(e.target.checked)} /><label className="form-check-label" htmlFor="update-prices-import">Actualizar precios de venta al recibir</label></div>
      <button className="btn btn-success" disabled={!canCreate || creating} onClick={handleCreate}>{creating ? 'Creando orden...' : 'Confirmar e importar orden'}</button>
    </div> : null}
  </div>;
}
