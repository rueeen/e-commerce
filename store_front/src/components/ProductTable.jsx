import { useEffect, useRef } from 'react';
import DataTable from 'datatables.net-bs5';

import 'datatables.net-bs5/css/dataTables.bootstrap5.css';

import { PRODUCT_TYPE_OPTIONS } from './ProductForm';

const typeLabel = Object.fromEntries(
  PRODUCT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const getCategoryName = (product) => {
  if (typeof product.category === 'object' && product.category !== null) {
    return product.category.name || '-';
  }

  return product.category_name || product.category || '-';
};

const getSingleCard = (product) => {
  return product.single_card || {};
};

const getCardImage = (product) => {
  const singleCard = getSingleCard(product);
  const mtgCard = singleCard.mtg_card || product.mtg_card || {};

  return (
    product.image ||
    mtgCard.image_small ||
    mtgCard.image_normal ||
    mtgCard.image_large ||
    ''
  );
};

const getCondition = (product) => {
  return getSingleCard(product).condition || product.condition || '-';
};

const getLanguage = (product) => {
  return getSingleCard(product).language || product.language || '-';
};

const getIsFoil = (product) => {
  const singleCard = getSingleCard(product);

  if (typeof singleCard.is_foil === 'boolean') {
    return singleCard.is_foil;
  }

  return Boolean(product.is_foil);
};

const stockClass = (stock, minimum = 1) => {
  if (stock <= 0) return 'badge-error';
  if (stock <= minimum) return 'badge-warning';
  return 'badge-success';
};

export default function ProductTable({
  products = [],
  onEdit,
  onToggleActive,
  onDelete,
  onViewKardex,
  onCreatePO,
  onApplySuggestedPrice,
}) {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current || !products.length) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    dataTableRef.current = new DataTable(tableRef.current, {
      paging: true,
      searching: true,
      ordering: true,
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100],
      responsive: true,
      language: {
        search: 'Buscar:',
        lengthMenu: 'Mostrar _MENU_ productos',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ productos',
        infoEmpty: 'Sin productos',
        zeroRecords: 'No se encontraron productos',
        paginate: {
          first: 'Primero',
          last: 'Último',
          next: 'Siguiente',
          previous: 'Anterior',
        },
      },
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [products]);

  if (!products.length) {
    return (
      <div className="panel-card p-4 text-center text-muted">
        No hay productos para mostrar.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table ref={tableRef} className="table align-middle mb-0">
        <thead>
          <tr>
            <th>ID</th>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Tipo</th>
            <th>Condición</th>
            <th>Foil</th>
            <th>Idioma</th>
            <th>Precio CLP</th>
            <th>Costo real</th>
            <th>Margen</th>
            <th>Precio sugerido</th>
            <th>Stock</th>
            <th>Estado</th>
            <th className="text-end">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => {
            const stock = Number(product.stock || 0);
            const minimum = Number(product.stock_minimum || 1);
            const image = getCardImage(product);
            const isSingle = product.product_type === 'single';
            const isFoil = getIsFoil(product);

            return (
              <tr key={product.id}>
                <td>{product.id}</td>

                <td>
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      width="42"
                      height="58"
                      style={{
                        objectFit: 'cover',
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>

                <td>
                  <div className="fw-semibold">{product.name}</div>
                  {product.single_card?.mtg_card?.set_code && (
                    <small className="text-muted">
                      {String(product.single_card.mtg_card.set_code).toUpperCase()} #
                      {product.single_card.mtg_card.collector_number || '-'}
                    </small>
                  )}
                </td>

                <td>{getCategoryName(product)}</td>

                <td>{typeLabel[product.product_type] || product.product_type}</td>

                <td>{isSingle ? getCondition(product) : '-'}</td>

                <td>
                  {isSingle ? (
                    <span className={`badge ${isFoil ? 'badge-warning' : 'badge-soft'}`}>
                      {isFoil ? 'Sí' : 'No'}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>

                <td>{isSingle ? getLanguage(product) : '-'}</td>

                <td>{formatMoney(product.computed_price_clp || product.price_clp)}</td>

                <td>{formatMoney(product.cost_real_clp)}</td>

                <td>
                  <span className={`badge ${Number(product.margin_clp || 0) < 0 ? "badge-error" : "badge-success"}`}>
                    {formatMoney(product.margin_clp)} ({Number(product.margin_percentage || 0).toFixed(2)}%)
                  </span>
                </td>

                <td>{formatMoney(product.price_clp_suggested || product.suggested_price_clp)}</td>

                <td>
                  <span className={`badge ${stockClass(stock, minimum)}`}>
                    {stock}
                  </span>
                </td>

                <td>
                  <span className={`badge ${product.is_active ? 'badge-success' : 'badge-soft'}`}>
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <div className="small text-muted mt-1">
                    {product.is_active ? 'Visible en tienda' : 'No visible en tienda'}
                  </div>
                </td>

                <td className="text-end">
                  <div className="d-flex justify-content-end gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-info btn-sm"
                      onClick={() => onViewKardex?.(product)}
                    >
                      Ver Kardex
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => onCreatePO?.(product)}
                    >
                      Crear OC
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => onEdit?.(product)}
                    >
                      Editar
                    </button>

                    {Number(product.margin_clp || 0) < 0 && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onApplySuggestedPrice?.(product)}
                      >
                        Aplicar sugerido
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => onToggleActive?.(product)}
                    >
                      {product.is_active ? 'Desactivar' : 'Activar'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onDelete?.(product)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
