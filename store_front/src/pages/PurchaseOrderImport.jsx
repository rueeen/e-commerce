import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const extraCostFields = [
  { key: 'import_duties_clp', label: 'Derechos de importación (CLP)' },
  { key: 'customs_fee_clp', label: 'Aduana / customs fee (CLP)' },
  { key: 'handling_fee_clp', label: 'Manejo / handling (CLP)' },
  { key: 'paypal_variation_clp', label: 'Variación pasarela/pago (CLP)' },
  { key: 'other_costs_clp', label: 'Otros costos (CLP)' },
];

const initialExtraCosts = {
  import_duties_clp: '',
  customs_fee_clp: '',
  handling_fee_clp: '',
  paypal_variation_clp: '',
  other_costs_clp: '',
};

const normalizeList = (data) => data?.results || data || [];

const formatMoney = (value, currency = '') => {
  const number = Number(value || 0).toLocaleString('es-CL');

  return currency ? `${currency} ${number}` : number;
};

export default function PurchaseOrderImport() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [sourceStore, setSourceStore] = useState('Card Kingdom');

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [creating, setCreating] = useState(false);
  const [updatePricesOnReceive, setUpdatePricesOnReceive] = useState(false);
  const [autoMatchScryfall, setAutoMatchScryfall] = useState(true);
  const [createMissingProducts, setCreateMissingProducts] = useState(false);
  const [activateCreatedProducts, setActivateCreatedProducts] = useState(false);

  const [extraCosts, setExtraCosts] = useState(initialExtraCosts);

  const totals = preview?.totals || {};
  const previewCurrency = preview?.currency || 'USD';

  const canCreate = useMemo(() => {
    return Boolean(
      preview &&
      file &&
      (supplierId || supplierName.trim()) &&
      !creating
    );
  }, [preview, file, supplierId, supplierName, creating]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);

    try {
      const { data } = await api.getSuppliers();
      setSuppliers(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSupplierChange = (value) => {
    setSupplierId(value);

    if (value) {
      setSupplierName('');
    }
  };

  const handleSupplierNameChange = (value) => {
    setSupplierName(value);

    if (value.trim()) {
      setSupplierId('');
    }
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(null);
  };

  const buildPreviewPayload = () => ({
    file,
    supplier_id: supplierId || undefined,
    supplier_name: supplierId ? undefined : supplierName.trim(),
    source_store: sourceStore || 'Card Kingdom',
  });

  const buildCreatePayload = () => ({
    file,
    supplier_id: supplierId || undefined,
    supplier_name: supplierId ? undefined : supplierName.trim(),
    source_store: sourceStore || 'Card Kingdom',
    original_currency: previewCurrency,
    update_prices_on_receive: updatePricesOnReceive,
    auto_match_scryfall: autoMatchScryfall,
    create_missing_products: createMissingProducts,
    activate_products: activateCreatedProducts,
    ...Object.fromEntries(
      Object.entries(extraCosts).map(([key, value]) => [
        key,
        Number(value || 0),
      ])
    ),
  });

  const validateBase = () => {
    if (!(file instanceof File)) {
      notyf.error('Selecciona un archivo .xlsx válido.');
      return false;
    }

    if (!supplierId && !supplierName.trim()) {
      notyf.error('Selecciona un proveedor o ingresa uno nuevo.');
      return false;
    }

    return true;
  };

  const handlePreview = async () => {
    if (!validateBase()) return;

    setLoadingPreview(true);
    setPreview(null);

    try {
      const { data } = await api.purchaseOrderImportPreview(buildPreviewPayload());
      setPreview(data);
      notyf.success('Previsualización lista.');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    setCreating(true);

    try {
      const { data } = await api.purchaseOrderImportCreate(buildCreatePayload());

      notyf.success(`Orden importada (${data.order_number}).`);
      navigate('/admin/ordenes-compra');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Importar orden desde Excel</h2>
          <p className="text-muted mb-0">
            Previsualiza el archivo, revisa los totales y crea una orden de compra.
          </p>
        </div>

        <Link to="/admin/ordenes-compra" className="btn btn-outline-secondary">
          Volver
        </Link>
      </div>

      <div className="card card-body mb-3">
        <h5>1) Archivo y proveedor</h5>

        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Archivo (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx"
              className="form-control"
              onChange={handleFileChange}
            />

            {file && (
              <div className="small text-muted mt-1">
                Archivo seleccionado: <strong>{file.name}</strong>
              </div>
            )}
          </div>

          <div className="col-md-4">
            <label className="form-label">Proveedor existente</label>
            <select
              className="form-select"
              value={supplierId}
              onChange={(event) => handleSupplierChange(event.target.value)}
              disabled={loadingSuppliers}
            >
              <option value="">
                {loadingSuppliers
                  ? 'Cargando proveedores...'
                  : 'Seleccionar proveedor existente'}
              </option>

              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label">Nuevo proveedor</label>
            <input
              className="form-control"
              value={supplierName}
              onChange={(event) => handleSupplierNameChange(event.target.value)}
              placeholder="Se usa si no eliges proveedor"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Tienda origen</label>
            <input
              className="form-control"
              value={sourceStore}
              onChange={(event) => setSourceStore(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={loadingPreview}
            onClick={handlePreview}
          >
            {loadingPreview ? 'Previsualizando...' : 'Previsualizar'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="card card-body mb-3">
          <h5>2) Preview</h5>

          <div className="row mb-2">
            <div className="col-md-3">
              <strong>Moneda:</strong> {preview.currency}
            </div>

            <div className="col-md-3">
              <strong>Ítems:</strong> {preview.items?.length || 0}
            </div>

            <div className="col-md-3">
              <strong>Warnings:</strong> {(preview.warnings || []).length}
            </div>

            <div className="col-md-3">
              <strong>Errores:</strong> {(preview.errors || []).length}
            </div>
          </div>

          <div className="alert alert-info">
            Subtotal:{' '}
            <strong>
              {formatMoney(totals.subtotal_original, preview.currency)}
            </strong>{' '}
            · Envío:{' '}
            <strong>
              {formatMoney(totals.shipping_original, preview.currency)}
            </strong>{' '}
            · Impuestos:{' '}
            <strong>
              {formatMoney(totals.sales_tax_original, preview.currency)}
            </strong>{' '}
            · Total:{' '}
            <strong>
              {formatMoney(totals.total_original, preview.currency)}
            </strong>
          </div>

          {(preview.warnings || []).length > 0 && (
            <details className="mb-3">
              <summary>Ver advertencias</summary>
              <ul className="mt-2">
                {preview.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          {(preview.errors || []).length > 0 && (
            <details className="mb-3">
              <summary>Ver errores</summary>
              <ul className="mt-2">
                {preview.errors.map((error, index) => (
                  <li key={index}>
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="table-responsive" style={{ maxHeight: 320 }}>
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Carta</th>
                  <th>Set</th>
                  <th>Condición</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total línea</th>
                </tr>
              </thead>

              <tbody>
                {(preview.items || []).map((item, index) => (
                  <tr key={index}>
                    <td>{item.normalized_card_name || item.raw_description}</td>
                    <td>{item.set_name_detected || '—'}</td>
                    <td>{item.style_condition}</td>
                    <td>{item.quantity_ordered}</td>
                    <td>{item.unit_price_original}</td>
                    <td>{item.line_total_original}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && (
        <div className="card card-body">
          <h5>3) Confirmación</h5>

          <div className="row g-2 mb-2">
            {extraCostFields.map((field) => (
              <div className="col-md-4" key={field.key}>
                <label className="form-label">{field.label}</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={extraCosts[field.key]}
                  onChange={(event) =>
                    setExtraCosts((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="form-check mb-2">
            <input
              id="update-prices-import"
              type="checkbox"
              className="form-check-input"
              checked={updatePricesOnReceive}
              onChange={(event) =>
                setUpdatePricesOnReceive(event.target.checked)
              }
            />

            <label className="form-check-label" htmlFor="update-prices-import">
              Actualizar precios de venta al recibir
            </label>
          </div>

          <div className="form-check mb-2">
            <input
              id="auto-match-scryfall"
              type="checkbox"
              className="form-check-input"
              checked={autoMatchScryfall}
              onChange={(event) => setAutoMatchScryfall(event.target.checked)}
            />

            <label className="form-check-label" htmlFor="auto-match-scryfall">
              Buscar coincidencias automáticamente en Scryfall
            </label>
          </div>

          <div className="form-check mb-3">
            <input
              id="create-missing-products"
              type="checkbox"
              className="form-check-input"
              checked={createMissingProducts}
              onChange={(event) => setCreateMissingProducts(event.target.checked)}
            />

            <label className="form-check-label" htmlFor="create-missing-products">
              Crear productos faltantes automáticamente
            </label>
          </div>

          {createMissingProducts && (
            <div className="form-check mb-3">
              <input
                id="activate-created-products"
                type="checkbox"
                className="form-check-input"
                checked={activateCreatedProducts}
                onChange={(event) => setActivateCreatedProducts(event.target.checked)}
              />

              <label className="form-check-label" htmlFor="activate-created-products">
                Activar productos creados automáticamente
              </label>
            </div>
          )}

          <button
            type="button"
            className="btn btn-success"
            disabled={!canCreate}
            onClick={handleCreate}
          >
            {creating ? 'Creando orden...' : 'Confirmar e importar orden'}
          </button>
        </div>
      )}
    </div>
  );
}
