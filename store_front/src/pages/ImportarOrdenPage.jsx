import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

import VendorInvoiceDropzone from '../components/po-import/VendorInvoiceDropzone';
import POImportSummary from '../components/po-import/POImportSummary';
import UnresolvedItemsTable from '../components/po-import/UnresolvedItemsTable';
import ReceiveOrderModal from '../components/po-import/ReceiveOrderModal';

import '../styles/poImport.css';

const initialExtraCosts = {
  import_duties_clp: 0,
  customs_fee_clp: 0,
  handling_fee_clp: 0,
  paypal_variation_clp: 0,
  other_costs_clp: 0,
};

const normalizeList = (data) => data?.results || data || [];

export default function ImportarOrdenPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [sourceStore, setSourceStore] = useState('Card Kingdom');
  const [originalCurrency, setOriginalCurrency] = useState('USD');

  const [extraCosts, setExtraCosts] = useState(initialExtraCosts);
  const [updatePrices, setUpdatePrices] = useState(false);
  const [autoMatchScryfall, setAutoMatchScryfall] = useState(true);
  const [createMissingProducts, setCreateMissingProducts] = useState(false);

  const [pricingSettings, setPricingSettings] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [error, setError] = useState('');

  const [importResult, setImportResult] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const loadInitialData = async () => {
    setLoadingInitialData(true);
    setError('');

    try {
      const [{ data: suppliersData }, { data: pricingData }] = await Promise.all([
        api.getSuppliers(),
        api.getActivePricingSettings(),
      ]);

      setSuppliers(normalizeList(suppliersData));
      setPricingSettings(pricingData);
    } catch {
      setError('No se pudieron cargar proveedores o configuración de precios.');
    } finally {
      setLoadingInitialData(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const updateExtraCost = (field, value) => {
    setExtraCosts((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const buildImportPayload = () => {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('source_store', sourceStore || 'Card Kingdom');
    formData.append('original_currency', originalCurrency || 'USD');
    formData.append('update_prices_on_receive', String(updatePrices));
    formData.append('auto_match_scryfall', String(autoMatchScryfall));
    formData.append('create_missing_products', String(createMissingProducts));

    formData.append('import_duties_clp', Number(extraCosts.import_duties_clp || 0));
    formData.append('customs_fee_clp', Number(extraCosts.customs_fee_clp || 0));
    formData.append('handling_fee_clp', Number(extraCosts.handling_fee_clp || 0));
    formData.append('paypal_variation_clp', Number(extraCosts.paypal_variation_clp || 0));
    formData.append('other_costs_clp', Number(extraCosts.other_costs_clp || 0));

    if (supplierId === 'other') {
      formData.append('supplier_name', supplierName.trim());
    } else if (supplierId) {
      formData.append('supplier_id', supplierId);
    }

    return formData;
  };

  const validateImport = () => {
    if (!file) {
      setError('Debes seleccionar un archivo XLSX.');
      return false;
    }

    if (!supplierId) {
      setError('Debes seleccionar un proveedor.');
      return false;
    }

    if (supplierId === 'other' && !supplierName.trim()) {
      setError('Debes ingresar el nombre del nuevo proveedor.');
      return false;
    }

    return true;
  };

  const importFile = async () => {
    if (!validateImport()) return;

    setLoading(true);
    setError('');
    setImportResult(null);
    setPurchaseOrder(null);

    try {
      const { data: createdOrder } = await api.purchaseOrderImportCreate(
        buildImportPayload()
      );

      setImportResult({
        purchase_order_id: createdOrder.id,
        order_number: createdOrder.order_number,
        items_count: createdOrder.items?.length || 0,
        items_unresolved:
          createdOrder.items?.filter((item) => !item.product).length || 0,
        unresolved_items:
          createdOrder.items?.filter((item) => !item.product) || [],
        parse_warnings: createdOrder.warnings || [],
        raw: createdOrder,
      });

      const { data: refreshedOrder } = await api.getPurchaseOrderById(
        createdOrder.id
      );

      setPurchaseOrder(refreshedOrder);

      notyf.success('Orden de compra importada correctamente.');
    } catch {
      setError('No se pudo importar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!purchaseOrder?.id) {
      notyf.error('No hay una orden válida para recibir.');
      return;
    }

    try {
      await api.receivePurchaseOrder(purchaseOrder.id);
      notyf.success('Orden recibida. Stock, lotes FIFO y Kardex actualizados.');
      navigate(`/admin/ordenes-compra`);
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  const handleItemResolved = async () => {
    if (!purchaseOrder?.id) return;

    try {
      const { data } = await api.getPurchaseOrderById(purchaseOrder.id);
      setPurchaseOrder(data);

      setImportResult((current) => {
        if (!current) return current;

        const unresolvedItems = (data.items || []).filter((item) => !item.product);

        return {
          ...current,
          items_unresolved: unresolvedItems.length,
          unresolved_items: unresolvedItems,
        };
      });
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  return (
    <div className="po-import-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Importar orden de compra</h2>
          <p className="text-muted mb-0">
            Carga una factura XLSX, normaliza los ítems, vincula cartas con Scryfall
            y prepara la recepción de stock.
          </p>
        </div>

        <button
          type="button"
          className="po-btn po-btn-light"
          onClick={() => navigate('/admin/ordenes-compra')}
        >
          Volver a órdenes
        </button>
      </div>

      {error ? (
        <div className="po-error-banner" aria-live="polite">
          {error}
        </div>
      ) : null}

      <section className="po-section">
        <h3>Archivo</h3>
        <VendorInvoiceDropzone
          onFile={setFile}
          accept=".xlsx"
          label={file ? file.name : 'Factura XLSX'}
        />

        {file && (
          <p className="text-muted small mt-2 mb-0">
            Archivo seleccionado: <strong>{file.name}</strong>
          </p>
        )}
      </section>

      <section className="po-section">
        <h3>Proveedor</h3>

        <label className="po-label">Proveedor</label>
        <select
          className="po-input"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          disabled={loadingInitialData}
        >
          <option value="">
            {loadingInitialData ? 'Cargando proveedores...' : 'Selecciona proveedor'}
          </option>

          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}

          <option value="other">Otro nuevo proveedor</option>
        </select>

        {supplierId === 'other' && (
          <>
            <label className="po-label">Nuevo proveedor</label>
            <input
              className="po-input"
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              placeholder="Ej: Card Kingdom"
            />
          </>
        )}
      </section>

      <section className="po-section">
        <h3>Origen y costos</h3>

        <label className="po-label">Tienda / origen</label>
        <input
          className="po-input"
          value={sourceStore}
          onChange={(event) => setSourceStore(event.target.value)}
          placeholder="Card Kingdom, TCGPlayer, etc."
        />

        <label className="po-label">Moneda del archivo</label>
        <select
          className="po-input"
          value={originalCurrency}
          onChange={(event) => setOriginalCurrency(event.target.value)}
        >
          <option value="USD">USD</option>
          <option value="CLP">CLP</option>
        </select>

        {pricingSettings && (
          <div className="small text-muted mt-2">
            Dólar sistema: {pricingSettings.usd_to_clp} CLP · dólar tienda:{' '}
            {pricingSettings.usd_to_clp_store || 'N/D'} CLP
          </div>
        )}

        <label className="po-label">Aduana CLP</label>
        <input
          className="po-input"
          type="number"
          value={extraCosts.import_duties_clp}
          onChange={(event) =>
            updateExtraCost('import_duties_clp', event.target.value)
          }
        />

        <label className="po-label">Customs fee CLP</label>
        <input
          className="po-input"
          type="number"
          value={extraCosts.customs_fee_clp}
          onChange={(event) =>
            updateExtraCost('customs_fee_clp', event.target.value)
          }
        />

        <label className="po-label">Handling CLP</label>
        <input
          className="po-input"
          type="number"
          value={extraCosts.handling_fee_clp}
          onChange={(event) =>
            updateExtraCost('handling_fee_clp', event.target.value)
          }
        />

        <label className="po-label">Variación PayPal CLP</label>
        <input
          className="po-input"
          type="number"
          value={extraCosts.paypal_variation_clp}
          onChange={(event) =>
            updateExtraCost('paypal_variation_clp', event.target.value)
          }
        />

        <label className="po-label">Otros costos CLP</label>
        <input
          className="po-input"
          type="number"
          value={extraCosts.other_costs_clp}
          onChange={(event) =>
            updateExtraCost('other_costs_clp', event.target.value)
          }
        />

        <label className="po-check">
          <input
            type="checkbox"
            checked={updatePrices}
            onChange={(event) => setUpdatePrices(event.target.checked)}
          />
          Actualizar precios al recibir
        </label>

        <label className="po-check">
          <input
            type="checkbox"
            checked={autoMatchScryfall}
            onChange={(event) => setAutoMatchScryfall(event.target.checked)}
          />
          Buscar coincidencias automáticamente en Scryfall
        </label>

        <label className="po-check">
          <input
            type="checkbox"
            checked={createMissingProducts}
            onChange={(event) => setCreateMissingProducts(event.target.checked)}
          />
          Crear productos faltantes automáticamente
        </label>

        <button
          type="button"
          className="po-btn po-btn-primary"
          onClick={importFile}
          disabled={loading}
        >
          {loading ? `Procesando ${file?.name || 'archivo'}...` : 'Importar archivo'}
        </button>
      </section>

      {importResult && (
        <section className="po-section">
          <POImportSummary
            importResult={importResult}
            customCosts={extraCosts}
            exchangeRate={pricingSettings?.usd_to_clp || ''}
          />

          {importResult.items_unresolved > 0 && (
            <UnresolvedItemsTable
              items={importResult.unresolved_items || []}
              purchaseOrderId={importResult.purchase_order_id}
              onItemResolved={handleItemResolved}
            />
          )}

          {(importResult.parse_warnings || []).length > 0 && (
            <details>
              <summary>Advertencias del archivo</summary>
              <ul>
                {importResult.parse_warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="po-actions">
            <button
              type="button"
              className="po-btn po-btn-light"
              onClick={() => navigate('/admin/ordenes-compra')}
            >
              Ver órdenes de compra
            </button>

            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={() => setShowReceiveModal(true)}
              disabled={!purchaseOrder || importResult.items_unresolved > 0}
            >
              Recibir orden ahora
            </button>
          </div>

          {importResult.items_unresolved > 0 && (
            <p className="po-error mt-2">
              Aún hay ítems sin resolver. Crea o vincula los productos antes de
              recibir la orden.
            </p>
          )}
        </section>
      )}

      {showReceiveModal && purchaseOrder && (
        <ReceiveOrderModal
          purchaseOrder={purchaseOrder}
          onConfirm={handleReceive}
          onClose={() => setShowReceiveModal(false)}
        />
      )}
    </div>
  );
}