import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from '../components/ProductAutocomplete';

const movementTypes = [
  { value: 'PURCHASE_IN', label: 'Compra / ingreso' },
  { value: 'SALE_OUT', label: 'Venta / salida' },
  { value: 'RETURN_IN', label: 'Devolución / ingreso' },
  { value: 'MANUAL_IN', label: 'Entrada manual' },
  { value: 'MANUAL_OUT', label: 'Salida manual' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'CORRECTION', label: 'Corrección' },
];

const initialFilters = {
  product_id: '',
  movement_type: '',
  date_from: '',
  date_to: '',
};

const initialForm = {
  movement_type: 'MANUAL_IN',
  quantity: 1,
  unit_cost_clp: 0,
  unit_price_clp: 0,
  reference_label: '',
  notes: '',
};

const normalizeList = (data) => data?.results || data || [];

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString('es-CL')}`;

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('es-CL');
  } catch {
    return value;
  }
};

const getMovementLabel = (value) => {
  return movementTypes.find((item) => item.value === value)?.label || value;
};

const getMovementBadgeClass = (type) => {
  if (['PURCHASE_IN', 'RETURN_IN', 'MANUAL_IN'].includes(type)) {
    return 'badge-success';
  }

  if (['SALE_OUT', 'MANUAL_OUT'].includes(type)) {
    return 'badge-error';
  }

  if (['ADJUSTMENT', 'CORRECTION'].includes(type)) {
    return 'badge-warning';
  }

  return 'badge-soft';
};

export default function AdminKardexPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedFilterProduct, setSelectedFilterProduct] = useState(null);
  const [selectedMovementProduct, setSelectedMovementProduct] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  const selectedMovementType = useMemo(
    () => movementTypes.find((item) => item.value === form.movement_type),
    [form.movement_type]
  );

  const loadProducts = async () => {
    setProductsLoading(true);

    try {
      const { data } = await api.getProducts({ active: 'true' });
      setProducts(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setProductsLoading(false);
    }
  };

  const loadMovements = async () => {
    setLoading(true);

    try {
      const params = {
        page,
        product_id: filters.product_id || undefined,
        movement_type: filters.movement_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };

      const { data } = await api.getKardex(params);
      setMovements(normalizeList(data));
      setPagination({
        count: Number(data?.count || 0),
        next: data?.next || null,
        previous: data?.previous || null,
      });
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [
    filters.product_id,
    filters.movement_type,
    filters.date_from,
    filters.date_to,
    page,
  ]);

  const totalPages = Math.max(1, Math.ceil((pagination.count || movements.length || 1) / 20));

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
    setPage(1);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSelectedFilterProduct(null);
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedMovementProduct(null);
  };

  const handleSelectFilterProduct = (product) => {
    setSelectedFilterProduct(product);
    updateFilter('product_id', String(product.id));
  };

  const submitMovement = async () => {
    if (!selectedMovementProduct) {
      notyf.error('Selecciona un producto.');
      return;
    }

    const quantity = Number(form.quantity || 0);

    if (quantity <= 0) {
      notyf.error('La cantidad debe ser mayor a 0.');
      return;
    }

    setSaving(true);

    try {
      await api.createKardexMovement({
        product: Number(selectedMovementProduct.id),
        movement_type: form.movement_type,
        quantity,
        unit_cost_clp: Number(form.unit_cost_clp || 0),
        unit_price_clp: Number(form.unit_price_clp || 0),
        reference_type: 'MANUAL',
        reference_label: form.reference_label,
        notes: form.notes,
      });

      notyf.success('Movimiento creado correctamente.');
      resetForm();
      await loadProducts();
      await loadMovements();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Kardex</h2>
          <p className="text-muted mb-0">
            Revisa movimientos de inventario y registra ajustes manuales.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={loadMovements}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={loading || !pagination.previous}
        >
          Anterior
        </button>
        <span className="text-muted">Página {page} de {totalPages}</span>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setPage((current) => current + 1)}
          disabled={loading || !pagination.next}
        >
          Siguiente
        </button>
      </div>

      <div className="panel-card p-3 mb-3">
        <h5 className="mb-3">Filtros</h5>

        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Producto</label>
            <ProductAutocomplete
              products={products}
              placeholder={
                productsLoading ? 'Cargando productos...' : 'Buscar producto...'
              }
              onSelect={handleSelectFilterProduct}
              selectedLabel={selectedFilterProduct?.name || ''}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Tipo de movimiento</label>
            <select
              className="form-select"
              value={filters.movement_type}
              onChange={(event) =>
                updateFilter('movement_type', event.target.value)
              }
            >
              <option value="">Todos los tipos</option>
              {movementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_from}
              onChange={(event) => updateFilter('date_from', event.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-control"
              value={filters.date_to}
              onChange={(event) => updateFilter('date_to', event.target.value)}
            />
          </div>

          <div className="col-md-1">
            <label className="form-label d-none d-md-block">&nbsp;</label>
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="panel-card p-3 mb-3">
        <h5 className="mb-2">Nuevo movimiento manual</h5>

        <div className="alert alert-warning py-2">
          Los movimientos manuales deben usarse solo en casos excepcionales. Para
          compras, ventas y cancelaciones usa los flujos normales del sistema.
        </div>

        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Producto</label>
            <ProductAutocomplete
              products={products}
              placeholder="Buscar producto para movimiento..."
              onSelect={setSelectedMovementProduct}
              selectedLabel={selectedMovementProduct?.name || ''}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Movimiento</label>
            <select
              className="form-select"
              value={form.movement_type}
              onChange={(event) =>
                updateForm('movement_type', event.target.value)
              }
            >
              {movementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label">Cantidad</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={form.quantity}
              onChange={(event) =>
                updateForm('quantity', Number(event.target.value))
              }
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Costo unitario</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.unit_cost_clp}
              onChange={(event) =>
                updateForm('unit_cost_clp', Number(event.target.value))
              }
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Precio unitario</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={form.unit_price_clp}
              onChange={(event) =>
                updateForm('unit_price_clp', Number(event.target.value))
              }
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Referencia</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Ajuste inventario físico"
              value={form.reference_label}
              onChange={(event) =>
                updateForm('reference_label', event.target.value)
              }
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Notas</label>
            <input
              type="text"
              className="form-control"
              placeholder="Detalle del movimiento"
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label d-none d-md-block">&nbsp;</label>
            <button
              type="button"
              className="btn btn-outline-success w-100"
              onClick={submitMovement}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>

        {selectedMovementProduct && (
          <div className="mt-3 small text-muted">
            Producto seleccionado: <strong>{selectedMovementProduct.name}</strong>
            {' | '}
            Stock actual: <strong>{selectedMovementProduct.stock}</strong>
            {' | '}
            Costo promedio:{' '}
            <strong>{formatMoney(selectedMovementProduct.average_cost_clp)}</strong>
            {' | '}
            Movimiento:{' '}
            <strong>{selectedMovementType?.label || form.movement_type}</strong>
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cant.</th>
              <th>Stock ant.</th>
              <th>Stock nuevo</th>
              <th>Costo</th>
              <th>Precio</th>
              <th>Referencia</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  Cargando movimientos...
                </td>
              </tr>
            )}

            {!loading && movements.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  No hay movimientos para los filtros seleccionados.
                </td>
              </tr>
            )}

            {!loading &&
              movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatDateTime(movement.created_at)}</td>
                  <td>{movement.product_name || movement.producto || '-'}</td>
                  <td>
                    <span
                      className={`badge ${getMovementBadgeClass(
                        movement.movement_type
                      )}`}
                    >
                      {getMovementLabel(movement.movement_type)}
                    </span>
                  </td>
                  <td>{movement.quantity}</td>
                  <td>{movement.previous_stock}</td>
                  <td>{movement.new_stock}</td>
                  <td>{formatMoney(movement.unit_cost_clp)}</td>
                  <td>{formatMoney(movement.unit_price_clp)}</td>
                  <td>
                    {movement.reference_label ||
                      movement.reference_display ||
                      movement.reference ||
                      '-'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}