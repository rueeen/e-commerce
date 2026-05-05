import { useMemo, useState } from 'react';

import { api } from '../../api/endpoints';
import ScryfallCardSearch from './ScryfallCardSearch';

const getItemName = (item) => {
  return (
    item.normalized_card_name ||
    item.card_name ||
    item.raw_description ||
    'Item sin nombre'
  );
};

const getItemSetHint = (item) => {
  return item.set_name_detected || item.set_hint || '—';
};

const getItemCondition = (item) => {
  return item.style_condition || item.condition || 'NM';
};

const getItemId = (item, index) => {
  return item.id || item.purchase_order_item_id || `${item.row || 'row'}-${index}`;
};

export default function UnresolvedItemsTable({
  items = [],
  purchaseOrderId,
  onItemResolved,
}) {
  const [rowState, setRowState] = useState({});
  const [selectedCards, setSelectedCards] = useState({});

  const resolvedCount = useMemo(() => {
    return Object.values(rowState).filter((status) => status === 'resolved').length;
  }, [rowState]);

  const updateRowState = (rowKey, status) => {
    setRowState((current) => ({
      ...current,
      [rowKey]: status,
    }));
  };

  const selectCard = (rowKey, card) => {
    setSelectedCards((current) => ({
      ...current,
      [rowKey]: card,
    }));
  };

  const resolveItem = async (item, index) => {
    const rowKey = getItemId(item, index);
    const selected = selectedCards[rowKey];

    if (!selected) return;

    if (!purchaseOrderId || !item.id) {
      updateRowState(rowKey, 'error');
      return;
    }

    updateRowState(rowKey, 'searching');

    try {
      await api.scryfallMatchPurchaseOrderItem(purchaseOrderId, {
        item_id: item.id,
        normalized_card_name: selected.name,
        set_name_detected: selected.set_name || selected.set || item.set_name_detected || '',
      });

      const { data } = await api.createProductFromPurchaseOrderItem(
        purchaseOrderId,
        item.id,
        {
          activate_product: false,
        }
      );

      updateRowState(rowKey, 'resolved');
      onItemResolved?.(data);
    } catch {
      updateRowState(rowKey, 'error');
    }
  };

  if (!items.length) {
    return (
      <div className="po-section">
        <h3>Cartas sin resolver</h3>
        <p className="text-muted mb-0">
          No hay ítems pendientes de resolver.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h3 className="mb-1">Cartas sin resolver</h3>
          <p className="text-muted mb-0">
            Selecciona la carta correcta en Scryfall y crea el producto asociado.
          </p>
        </div>

        <span className="badge badge-soft">
          {resolvedCount} de {items.length} resueltos
        </span>
      </div>

      <div className="po-table-wrapper">
        <table className="po-table">
          <thead>
            <tr>
              <th>Nombre encontrado</th>
              <th>Set hint</th>
              <th>Condición</th>
              <th>Cantidad</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => {
              const rowKey = getItemId(item, index);
              const status = rowState[rowKey] || 'idle';
              const selected = selectedCards[rowKey];

              return (
                <tr
                  key={rowKey}
                  className={status === 'resolved' ? 'row-resolved' : ''}
                >
                  <td>{getItemName(item)}</td>
                  <td>{getItemSetHint(item)}</td>
                  <td>{getItemCondition(item)}</td>
                  <td>{item.quantity_ordered || item.qty || 1}</td>

                  <td>
                    {status === 'resolved' ? (
                      <span className="badge badge-success">
                        ✅ Resuelta
                      </span>
                    ) : (
                      <>
                        <ScryfallCardSearch
                          placeholder="Buscar carta exacta"
                          defaultValue={getItemName(item)}
                          onSelect={(card) => selectCard(rowKey, card)}
                        />

                        {selected && (
                          <div className="small text-muted mt-2">
                            Seleccionada:{' '}
                            <strong>{selected.name}</strong>
                            {' · '}
                            {(selected.set_code || selected.set || '').toUpperCase()}
                            {' #'}
                            {selected.collector_number || '—'}
                          </div>
                        )}

                        <button
                          type="button"
                          className="po-btn po-btn-primary mt-2"
                          disabled={!selected || status === 'searching'}
                          onClick={() => resolveItem(item, index)}
                        >
                          {status === 'searching'
                            ? 'Resolviendo...'
                            : 'Crear producto'}
                        </button>

                        {status === 'error' && (
                          <div className="po-error mt-2" aria-live="polite">
                            No se pudo resolver este ítem.
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted mt-2 mb-0">
        {resolvedCount} de {items.length} ítems resueltos.
      </p>
    </div>
  );
}