import { useMemo, useState } from 'react';
import { apiClient } from '../../api/fetchClient';
import ScryfallCardSearch from './ScryfallCardSearch';

export default function UnresolvedItemsTable({ items = [], purchaseOrderId, onItemResolved }) {
  const [rowState, setRowState] = useState({});
  const [selectedCards, setSelectedCards] = useState({});

  const resolvedCount = useMemo(() => Object.values(rowState).filter((s) => s === 'resolved').length, [rowState]);

  const resolveItem = async (item, idx) => {
    const selected = selectedCards[idx];
    if (!selected) return;
    try {
      setRowState((s) => ({ ...s, [idx]: 'searching' }));
      const payload = {
        card_name: item.card_name,
        scryfall_id: selected.id,
        condition: item.condition || 'NM',
        is_foil: !!item.is_foil,
        qty: item.qty || 1,
        price_usd: item.price_usd || 0,
      };
      const data = await apiClient(`/api/products/purchase-orders/${purchaseOrderId}/resolve-item/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setRowState((s) => ({ ...s, [idx]: 'resolved' }));
      onItemResolved?.(data);
    } catch {
      setRowState((s) => ({ ...s, [idx]: 'error' }));
    }
  };

  return <div>
    <h3>Cartas sin resolver</h3>
    <table className="po-table">
      <thead><tr><th>Nombre encontrado</th><th>Set hint</th><th>Acción</th></tr></thead>
      <tbody>
        {items.map((item, idx) => {
          const status = rowState[idx] || 'idle';
          return <tr key={`${item.row}-${idx}`} className={status === 'resolved' ? 'row-resolved' : ''}>
            <td>{item.card_name}</td>
            <td>{item.set_hint || '—'}</td>
            <td>
              {status === 'resolved' ? <span>✅ Agregada</span> : <>
                <ScryfallCardSearch placeholder="Buscar carta exacta" onSelect={(card) => setSelectedCards((s) => ({ ...s, [idx]: card }))} defaultValue={item.card_name} />
                <button type="button" className="po-btn po-btn-primary" disabled={!selectedCards[idx] || status === 'searching'} onClick={() => resolveItem(item, idx)}>
                  {status === 'searching' ? 'Agregando...' : 'Agregar a la orden'}
                </button>
                {status === 'error' ? <span className="po-error" aria-live="polite">No se pudo resolver este item.</span> : null}
              </>}
            </td>
          </tr>;
        })}
      </tbody>
    </table>
    <p>{resolvedCount} de {items.length} resueltos</p>
  </div>;
}
