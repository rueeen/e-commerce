const formatCLP = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const formatMoney = (value, currency = 'USD') => {
  if (currency === 'CLP') {
    return formatCLP(value);
  }

  return `${currency} ${Number(value || 0).toFixed(2)}`;
};

const getTotal = (totals, key) => {
  return Number(
    totals?.[key] ??
    totals?.[key.replace('_original', '_usd')] ??
    0
  );
};

export default function POImportSummary({
  importResult,
  customCosts = {},
  exchangeRate,
}) {
  if (!importResult) return null;

  const totals = importResult.totals || importResult.totals_parsed || {};
  const currency = importResult.currency || 'USD';

  const subtotalOriginal = getTotal(totals, 'subtotal_original');
  const shippingOriginal = getTotal(totals, 'shipping_original');
  const taxOriginal = getTotal(totals, 'sales_tax_original');
  const totalOriginal =
    getTotal(totals, 'total_original') ||
    subtotalOriginal + shippingOriginal + taxOriginal;

  const importDuties = Number(customCosts.import_duties_clp || 0);
  const customsFee = Number(customCosts.customs_fee_clp || 0);
  const handlingFee = Number(customCosts.handling_fee_clp || 0);
  const paypalVariation = Number(customCosts.paypal_variation_clp || 0);
  const otherCosts = Number(customCosts.other_costs_clp || 0);

  const extraCostsClp =
    importDuties + customsFee + handlingFee + paypalVariation + otherCosts;

  const exchange = Number(exchangeRate || 0);

  const totalOriginClp =
    currency === 'CLP'
      ? Math.round(totalOriginal)
      : Math.round(totalOriginal * exchange);

  const totalEstimatedClp = totalOriginClp + extraCostsClp;

  const itemsCount =
    importResult.items_count ||
    importResult.items_imported ||
    importResult.items?.length ||
    importResult.raw?.items?.length ||
    0;

  const unresolvedCount =
    importResult.items_unresolved ||
    importResult.unresolved_items?.length ||
    0;

  const warningsCount =
    importResult.parse_warnings?.length ||
    importResult.warnings?.length ||
    0;

  return (
    <div className="po-summary">
      <div className="po-metrics-grid">
        <div className="po-metric">
          <strong>{itemsCount}</strong>
          <span>Ítems detectados</span>
        </div>

        <div className="po-metric">
          <strong>{importResult.items_created || 0}</strong>
          <span>Productos nuevos</span>
        </div>

        <div className="po-metric">
          <strong>{importResult.items_matched || 0}</strong>
          <span>Ya existentes</span>
        </div>

        <div className="po-metric">
          <strong>{unresolvedCount}</strong>
          <span>Sin resolver</span>
        </div>

        <div className="po-metric">
          <strong>{warningsCount}</strong>
          <span>Advertencias</span>
        </div>
      </div>

      <div className="po-totals mt-3">
        <p>
          Subtotal origen:{' '}
          <strong>{formatMoney(subtotalOriginal, currency)}</strong>
        </p>

        <p>
          Envío origen:{' '}
          <strong>{formatMoney(shippingOriginal, currency)}</strong>
        </p>

        <p>
          Impuestos origen:{' '}
          <strong>{formatMoney(taxOriginal, currency)}</strong>
        </p>

        <p>
          Total origen:{' '}
          <strong>{formatMoney(totalOriginal, currency)}</strong>
        </p>

        {currency !== 'CLP' && (
          <p>
            Tipo de cambio:{' '}
            <strong>{Number(exchange || 0).toLocaleString('es-CL')} CLP</strong>
          </p>
        )}

        <p>
          Total origen estimado CLP:{' '}
          <strong>{formatCLP(totalOriginClp)}</strong>
        </p>

        <p>
          Costos extra CLP:{' '}
          <strong>{formatCLP(extraCostsClp)}</strong>
        </p>

        <p className="fs-5">
          Total estimado CLP:{' '}
          <strong>{formatCLP(totalEstimatedClp)}</strong>
        </p>
      </div>
    </div>
  );
}