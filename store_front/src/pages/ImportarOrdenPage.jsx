import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notyf } from '../api/notifier';
import { apiClient } from '../api/fetchClient';
import VendorInvoiceDropzone from '../components/po-import/VendorInvoiceDropzone';
import POImportSummary from '../components/po-import/POImportSummary';
import UnresolvedItemsTable from '../components/po-import/UnresolvedItemsTable';
import ReceiveOrderModal from '../components/po-import/ReceiveOrderModal';
import '../styles/poImport.css';

export default function ImportarOrdenPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [customCosts, setCustomCosts] = useState({ customs_clp: 0, handling_clp: 0, other_costs_clp: 0 });
  const [updatePrices, setUpdatePrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [suppliersData, pricing] = await Promise.all([
          apiClient('/api/products/suppliers/'),
          apiClient('/api/products/pricing-settings/active/'),
        ]);
        setSuppliers(suppliersData.results || suppliersData || []);
        setExchangeRate(pricing?.usd_to_clp || pricing?.exchange_rate || '');
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const importFile = async () => {
    if (!file) return setError('Debes seleccionar un archivo XLSX.');
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('exchange_rate', exchangeRate);
      form.append('update_prices_on_receive', updatePrices);
      form.append('customs_clp', customCosts.customs_clp);
      form.append('handling_clp', customCosts.handling_clp);
      form.append('other_costs_clp', customCosts.other_costs_clp);
      if (supplierId === 'other') form.append('supplier_name', supplierName);
      else if (supplierId) form.append('supplier_id', supplierId);

      const result = await apiClient('/api/products/purchase-orders/import-vendor-invoice/', { method: 'POST', body: form });
      setImportResult(result);
      const po = await apiClient(`/api/products/purchase-orders/${result.purchase_order_id}/`);
      setPurchaseOrder(po);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    await apiClient(`/api/products/purchase-orders/${purchaseOrder.id}/receive/`, { method: 'POST' });
    notyf.success('Orden recibida — productos actualizados');
    navigate(`/admin/ordenes-compra/${purchaseOrder.id}`);
  };

  return <div className="po-import-page">
    <h2>Importar orden de compra</h2>
    {error ? <div className="po-error-banner" aria-live="polite">{error}</div> : null}

    <section className="po-section">
      <h3>Archivo</h3>
      <VendorInvoiceDropzone onFile={setFile} accept=".xlsx" label="Factura XLSX" />
    </section>

    <section className="po-section">
      <h3>Proveedor</h3>
      <label className="po-label">Proveedor</label>
      <select className="po-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
        <option value="">Selecciona proveedor</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="other">Otro (nuevo proveedor)</option>
      </select>
      {supplierId === 'other' ? <><label className="po-label">Nuevo proveedor</label><input className="po-input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></> : null}
    </section>

    <section className="po-section">
      <h3>Tipo de cambio y costos</h3>
      <label className="po-label">USD → CLP</label><input className="po-input" type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
      <label className="po-label">Aduana CLP</label><input className="po-input" type="number" value={customCosts.customs_clp} onChange={(e) => setCustomCosts((s) => ({ ...s, customs_clp: e.target.value }))} />
      <label className="po-label">Manejo CLP</label><input className="po-input" type="number" value={customCosts.handling_clp} onChange={(e) => setCustomCosts((s) => ({ ...s, handling_clp: e.target.value }))} />
      <label className="po-label">Otros costos CLP</label><input className="po-input" type="number" value={customCosts.other_costs_clp} onChange={(e) => setCustomCosts((s) => ({ ...s, other_costs_clp: e.target.value }))} />
      <label className="po-check"><input type="checkbox" checked={updatePrices} onChange={(e) => setUpdatePrices(e.target.checked)} /> Actualizar precios al recibir</label>
      <button className="po-btn po-btn-primary" onClick={importFile} disabled={loading}>{loading ? `Procesando ${file?.name || 'archivo'}...` : 'Importar archivo'}</button>
    </section>

    {importResult ? <section className="po-section">
      <POImportSummary importResult={importResult} customCosts={customCosts} exchangeRate={exchangeRate} />
      {!!importResult.items_unresolved && <UnresolvedItemsTable items={importResult.unresolved_items || []} purchaseOrderId={importResult.purchase_order_id} onItemResolved={() => setImportResult((v) => ({ ...v, items_unresolved: Math.max(0, v.items_unresolved - 1) }))} />}
      {(importResult.parse_warnings || []).length > 0 ? <details><summary>Advertencias del archivo</summary><ul>{importResult.parse_warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details> : null}
      <div className="po-actions"><button className="po-btn po-btn-light" onClick={() => navigate(`/admin/ordenes-compra/${importResult.purchase_order_id}`)}>Ver orden de compra</button><button className="po-btn po-btn-primary" onClick={() => setShowReceiveModal(true)}>Recibir orden ahora</button></div>
    </section> : null}

    {showReceiveModal ? <ReceiveOrderModal purchaseOrder={purchaseOrder} onConfirm={handleReceive} onClose={() => setShowReceiveModal(false)} /> : null}
  </div>;
}
