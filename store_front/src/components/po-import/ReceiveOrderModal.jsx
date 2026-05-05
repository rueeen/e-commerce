import { useMemo, useState } from 'react';

const formatCLP = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

export default function ReceiveOrderModal({
  purchaseOrder,
  onConfirm,
  onClose,
}) {
  const [costs, setCosts] = useState({
    import_duties_clp: purchaseOrder?.import_duties_clp || 0,
    customs_fee_clp: purchaseOrder?.customs_fee_clp || 0,
    handling_fee_clp: purchaseOrder?.handling_fee_clp || 0,
    paypal_variation_clp: purchaseOrder?.paypal_variation_clp || 0,
    other_costs_clp: purchaseOrder?.other_costs_clp || 0,
  });

  const [updatePrices, setUpdatePrices] = useState(
    Boolean(purchaseOrder?.update_prices_on_receive)
  );

  const [loading, setLoading] = useState(false);

  const itemsCount = purchaseOrder?.items?.length || 0;

  const totalExtraCosts = useMemo(() => {
    return Object.values(costs).reduce(
      (acc, value) => acc + Number(value || 0),
      0
    );
  }, [costs]);

  const updateCost = (field, value) => {
    setCosts((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async () => {
    setLoading(true);

    try {
      await onConfirm({
        import_duties_clp: Number(costs.import_duties_clp || 0),
        customs_fee_clp: Number(costs.customs_fee_clp || 0),
        handling_fee_clp: Number(costs.handling_fee_clp || 0),
        paypal_variation_clp: Number(costs.paypal_variation_clp || 0),
        other_costs_clp: Number(costs.other_costs_clp || 0),
        update_prices_on_receive: updatePrices,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseOrder) return null;

  return (
    <div className="po-modal-backdrop">
      <div className="po-modal">
        <h3>Recibir orden {purchaseOrder.order_number}</h3>

        <p className="mb-1">
          <strong>Proveedor:</strong> {purchaseOrder.supplier_name || '-'}
        </p>

        <p className="mb-3">
          <strong>Ítems a recibir:</strong> {itemsCount}
        </p>

        <div className="alert alert-warning py-2">
          Al confirmar, el sistema debería aumentar stock, crear lotes FIFO y
          registrar movimientos Kardex.
        </div>

        <label className="po-label">Derechos de importación CLP</label>
        <input
          className="po-input"
          type="number"
          min="0"
          value={costs.import_duties_clp}
          onChange={(event) =>
            updateCost('import_duties_clp', event.target.value)
          }
        />

        <label className="po-label">Aduana / customs fee CLP</label>
        <input
          className="po-input"
          type="number"
          min="0"
          value={costs.customs_fee_clp}
          onChange={(event) =>
            updateCost('customs_fee_clp', event.target.value)
          }
        />

        <label className="po-label">Handling real CLP</label>
        <input
          className="po-input"
          type="number"
          min="0"
          value={costs.handling_fee_clp}
          onChange={(event) =>
            updateCost('handling_fee_clp', event.target.value)
          }
        />

        <label className="po-label">Variación PayPal / pasarela CLP</label>
        <input
          className="po-input"
          type="number"
          min="0"
          value={costs.paypal_variation_clp}
          onChange={(event) =>
            updateCost('paypal_variation_clp', event.target.value)
          }
        />

        <label className="po-label">Otros costos reales CLP</label>
        <input
          className="po-input"
          type="number"
          min="0"
          value={costs.other_costs_clp}
          onChange={(event) =>
            updateCost('other_costs_clp', event.target.value)
          }
        />

        <div className="po-section mt-3 mb-2">
          <strong>Total costos extra:</strong> {formatCLP(totalExtraCosts)}
        </div>

        <label className="po-check">
          <input
            type="checkbox"
            checked={updatePrices}
            onChange={(event) => setUpdatePrices(event.target.checked)}
          />
          ¿Actualizar precios al recibir?
        </label>

        <div className="po-actions">
          <button
            type="button"
            className="po-btn po-btn-light"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Confirmando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}