export default function POImportSummary({ importResult, customCosts, exchangeRate }) {
  if (!importResult) return null;
  const totals = importResult.totals_parsed || {};
  const customs = Number(customCosts.customs_clp || 0);
  const handling = Number(customCosts.handling_clp || 0);
  const other = Number(customCosts.other_costs_clp || 0);
  const totalUsd = Number(totals.subtotal_usd || 0) + Number(totals.shipping_usd || 0);
  const totalClp = Math.round(totalUsd * Number(exchangeRate || 0) + customs + handling + other);

  return <div className="po-summary">
    <div className="po-metrics-grid">
      <div className="po-metric"><strong>{importResult.items_imported || 0}</strong><span>Items importados</span></div>
      <div className="po-metric"><strong>{importResult.items_created || 0}</strong><span>Productos nuevos</span></div>
      <div className="po-metric"><strong>{importResult.items_matched || 0}</strong><span>Ya existentes</span></div>
      <div className="po-metric"><strong>{importResult.items_unresolved || 0}</strong><span>Sin resolver</span></div>
      <div className="po-metric"><strong>{(importResult.parse_warnings || []).length}</strong><span>Advertencias</span></div>
    </div>
    <div className="po-totals">
      <p>Subtotal USD: ${Number(totals.subtotal_usd || 0).toFixed(2)}</p>
      <p>Shipping USD: ${Number(totals.shipping_usd || 0).toFixed(2)}</p>
      <p>Impuestos y aduana (CLP): ${customs.toLocaleString('es-CL')}</p>
      <p>Total estimado CLP: <strong>${totalClp.toLocaleString('es-CL')}</strong></p>
    </div>
  </div>;
}
