import { useState } from 'react';

export default function ReceiveOrderModal({ purchaseOrder, onConfirm, onClose }) {
  const [customs, setCustoms] = useState(purchaseOrder?.customs_clp || 0);
  const [handling, setHandling] = useState(purchaseOrder?.handling_clp || 0);
  const [other, setOther] = useState(purchaseOrder?.other_costs_clp || 0);
  const [updatePrices, setUpdatePrices] = useState(!!purchaseOrder?.update_prices_on_receive);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await onConfirm({ customs_clp: Number(customs), handling_clp: Number(handling), other_costs_clp: Number(other), update_prices_on_receive: updatePrices });
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseOrder) return null;
  return <div className="po-modal-backdrop">
    <div className="po-modal">
      <h3>Recibir orden {purchaseOrder.order_number}</h3>
      <p>Proveedor: {purchaseOrder.supplier_name}</p>
      <p>Items a recibir: {purchaseOrder.items?.length || 0}</p>
      <label className="po-label">Aduana real CLP</label><input className="po-input" type="number" value={customs} onChange={(e) => setCustoms(e.target.value)} />
      <label className="po-label">Handling real CLP</label><input className="po-input" type="number" value={handling} onChange={(e) => setHandling(e.target.value)} />
      <label className="po-label">Otros costos reales CLP</label><input className="po-input" type="number" value={other} onChange={(e) => setOther(e.target.value)} />
      <label className="po-check"><input type="checkbox" checked={updatePrices} onChange={(e) => setUpdatePrices(e.target.checked)} /> ¿Actualizar precios al recibir?</label>
      <div className="po-actions"><button className="po-btn po-btn-light" onClick={onClose}>Cancelar</button><button className="po-btn po-btn-primary" onClick={submit} disabled={loading}>{loading ? 'Confirmando...' : 'Confirmar recepción'}</button></div>
    </div>
  </div>;
}
