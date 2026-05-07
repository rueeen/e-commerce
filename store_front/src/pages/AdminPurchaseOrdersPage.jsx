import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from '../components/ProductAutocomplete';
import LoadingOverlay from '../components/LoadingOverlay';
import LoadingButton from '../components/LoadingButton';

const emptyForm = {
  supplier: '',
  order_number: '',
  external_reference: '',
  source_store: '',
  original_currency: 'CLP',
  notes: '',
  status: 'DRAFT',
  purchase_order_type: 'general',

  shipping_original: '',
  sales_tax_original: '',
  import_duties_clp: '',
  customs_fee_clp: '',
  handling_fee_clp: '',
  paypal_variation_clp: '',
  other_costs_clp: '',

  update_prices_on_receive: false,
  items: [],
};

const statusLabels = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const normalizeList = (data) => data?.results || data || [];

const formatMoney = (value, currency = 'CLP') => {
  const normalizedCurrency = String(currency || 'CLP').toUpperCase();

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: normalizedCurrency === 'USD' ? 'USD' : 'CLP',
  }).format(Number(value || 0));
};

const formatDate = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('es-CL');
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('es-CL');
  } catch {
    return value;
  }
};

const getStatusBadgeClass = (status) => {
  if (status === 'RECEIVED') return 'badge-success';
  if (status === 'SENT') return 'badge-warning';
  if (status === 'CANCELLED') return 'badge-error';
  return 'badge-soft';
};

const toNumber = (value) => Number(value || 0);

const buildItemSubtotal = (item) => {
  return toNumber(item.quantity_ordered) * toNumber(item.unit_price_original);
};

const MARGIN_FACTOR_PREVIEW = 1.09;

const roundUp = (value) => Math.ceil(Number(value || 0));

const estimateSuggestedPrice = (unitCost) => {
  return roundUp(toNumber(unitCost) * MARGIN_FACTOR_PREVIEW);
};

const getProductUnitCostForOrder = (product, currency) => {
  const normalizedCurrency = String(currency || 'CLP').toUpperCase();

  if (normalizedCurrency === 'USD') {
    return Number(
      product.single_card?.price_usd_reference ??
      product.price_external_usd ??
      product.sealed_product?.price_usd_reference ??
      0
    );
  }

  return Number(
    product.last_purchase_cost_clp ??
      product.average_cost_clp ??
      product.cost_real_clp ??
      0
  );
};

const buildManualItemFromProduct = (product, currency) => {
  const costUnit = getProductUnitCostForOrder(product, currency);

  const suggestedPrice = Number(
    product.price_clp_suggested ??
      product.suggested_price_clp ??
      product.precio_sugerido_clp ??
      product.price_clp ??
      0
  );

  const quantity = 1;

  return {
    product: product.id,
    product_id: product.id,
    name: product.name || product.single_card?.mtg_card?.name || `Producto #${product.id}`,
    source_product: product,
    quantity_ordered: String(quantity),
    unit_price_original: String(costUnit || 0),
    line_total_original: costUnit * quantity,
    subtotal_clp: costUnit * quantity,
    current_price: product.price_clp || 0,
    suggested_sale_price_clp: suggestedPrice || 0,
    sale_price_to_apply_clp: suggestedPrice || 0,
    suggested: suggestedPrice
      ? { suggested_price_clp: suggestedPrice, min_price_clp: 0, source: 'product' }
      : null,
  };
};

const getMissingProductsCount = (order) => {
  const value = Number(order?.missing_products_count);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  if (Array.isArray(order?.items)) {
    return order.items.filter((item) => !item.product).length;
  }

  return 0;
};

const canReceiveOrder = (order) => {
  const missingProductsCount = getMissingProductsCount(order);

  return (
    missingProductsCount === 0 &&
    order?.status !== 'RECEIVED' &&
    order?.status !== 'CANCELLED'
  );
};

export default function AdminPurchaseOrdersPage() {
  const [search] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const [receivingId, setReceivingId] = useState(null);
  const [creatingMissingId, setCreatingMissingId] = useState(null);
  const [isImportingPreview] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCreatingMissingProducts, setIsCreatingMissingProducts] = useState(false);
  const [isReceivingOrder, setIsReceivingOrder] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    setIsRefreshing(true);

    try {
      const [{ data: ordersData }, { data: suppliersData }, allProducts] =
        await Promise.all([
          api.getPurchaseOrders(),
          api.getSuppliers(),
          api.fetchAllProducts(),
        ]);

      setOrders(normalizeList(ordersData));
      setSuppliers(normalizeList(suppliersData));
      setProducts(Array.isArray(allProducts) ? allProducts : []);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const preProduct = Number(search.get('product_id'));

    if (!preProduct || products.length === 0) return;

    const product = products.find((item) => item.id === preProduct);

    if (!product) return;

    setShowForm(true);

    setForm((current) => {
      const alreadyAdded = current.items.some((item) => item.product_id === product.id);

      if (alreadyAdded) return current;

      return {
        ...current,
        items: [...current.items, buildManualItemFromProduct(product, current.original_currency)],
      };
    });
  }, [search, products]);

  const subtotalOriginal = useMemo(() => {
    return form.items.reduce((acc, item) => acc + buildItemSubtotal(item), 0);
  }, [form.items]);

  const shippingOriginal = toNumber(form.shipping_original);
  const salesTaxOriginal = toNumber(form.sales_tax_original);
  const importDuties = toNumber(form.import_duties_clp);
  const customsFee = toNumber(form.customs_fee_clp);
  const handlingFee = toNumber(form.handling_fee_clp);
  const paypalVariation = toNumber(form.paypal_variation_clp);
  const otherCosts = toNumber(form.other_costs_clp);

  const originalTotal = subtotalOriginal + shippingOriginal + salesTaxOriginal;

  const extraCostsClp =
    importDuties + customsFee + handlingFee + paypalVariation + otherCosts;

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const fetchSuggested = async (index, unitCost, productId) => {
    const item = form.items[index];
    const targetProductId = productId || item?.product || item?.product_id;

    if (!targetProductId) return;

    try {
      const { data } = await api.productSuggestedPrice(
        targetProductId,
        Number(unitCost || 0)
      );

      setForm((current) => ({
        ...current,
        items: current.items.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                suggested: data,
                suggested_sale_price_clp: data?.suggested_price_clp || 0,
              }
            : row
        ),
      }));
    } catch {
      setForm((current) => ({
        ...current,
        items: current.items.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                suggested: null,
                suggested_sale_price_clp: estimateSuggestedPrice(row.unit_price_original),
              }
            : row
        ),
      }));
    }
  };

  const addItem = (product) => {
    if (!product?.id) return;

    if (form.items.some((item) => item.product_id === product.id)) {
      notyf.error('El producto ya está agregado a la orden.');
      return;
    }

    const index = form.items.length;
    const newItem = buildManualItemFromProduct(product, form.original_currency);

    if (Number(newItem.unit_price_original || 0) <= 0) {
      if (typeof notyf.open === 'function') {
        notyf.open({
          type: 'warning',
          message: 'Producto agregado. Ingresa el costo unitario de compra antes de guardar la orden.',
        });
      } else {
        notyf.error('Producto agregado. Ingresa el costo unitario de compra antes de guardar la orden.');
      }
    }

    setForm((current) => ({
      ...current,
      items: [...current.items, newItem],
    }));

    fetchSuggested(index, newItem.unit_price_original, product.id);
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleViewDetail = async (orderId) => {
    setLoadingDetailId(orderId);

    try {
      const { data } = await api.getPurchaseOrderById(orderId);
      setSelectedOrder(data);
      setShowModal(true);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoadingDetailId(null);
    }
  };

  const createMissingProducts = async (orderId) => {
    const ok = window.confirm(
      'Esto intentará crear automáticamente los productos faltantes desde los datos importados y Scryfall. ¿Deseas continuar?'
    );

    if (!ok) return;

    setCreatingMissingId(orderId);
    setIsCreatingMissingProducts(true);

    try {
      await api.createMissingProductsFromPurchaseOrder(orderId, {
        activate_products: false,
      });

      notyf.success('Productos faltantes creados o vinculados correctamente.');
      await load();

      if (selectedOrder?.id === orderId) {
        const { data } = await api.getPurchaseOrderById(orderId);
        setSelectedOrder(data);
      }
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setCreatingMissingId(null);
      setIsCreatingMissingProducts(false);
    }
  };

  const receive = async (id) => {
    const order = orders.find((item) => item.id === id);
    const missingProductsCount = getMissingProductsCount(order);

    if (missingProductsCount > 0) {
      notyf.error(
        `No puedes recibir esta orden. Faltan ${missingProductsCount} productos por vincular.`
      );
      return;
    }

    const ok = window.confirm(
      'Esto aumentará el stock, creará lotes FIFO y generará movimientos Kardex. ¿Deseas continuar?'
    );

    if (!ok) return;

    setReceivingId(id);
    setIsReceivingOrder(true);

    try {
      await api.receivePurchaseOrder(id);
      notyf.success('Orden marcada como recibida.');
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setReceivingId(null);
      setIsReceivingOrder(false);
    }
  };


  const validateForm = () => {
    if (!form.supplier) {
      notyf.error('Debes seleccionar un proveedor.');
      return false;
    }

    if (form.items.length === 0) {
      notyf.error('Debes agregar al menos un producto.');
      return false;
    }

    const invalidQty = form.items.some(
      (item) => Number(item.quantity_ordered || 0) <= 0
    );

    if (invalidQty) {
      notyf.error('La cantidad de cada item debe ser mayor a 0.');
      return false;
    }

    const invalidCost = form.items.some(
      (item) => Number(item.unit_price_original || 0) <= 0
    );

    if (invalidCost) {
      notyf.error('Ingrese costo unitario de compra.');
      return false;
    }

    return true;
  };

  const save = async (status) => {
    if (isSaving) return;

    if (!validateForm()) return;

    setIsSaving(true);
    setIsCreatingOrder(true);

    try {
      const orderNumber = form.order_number?.trim();

      const payload = {
        supplier: Number(form.supplier),
        ...(orderNumber ? { order_number: orderNumber } : {}),
        external_reference: form.external_reference || '',
        status,
        source_store: form.source_store || '',
        purchase_order_type: form.purchase_order_type || 'general',
        original_currency: form.original_currency || 'USD',

        subtotal_original: subtotalOriginal,
        shipping_original: shippingOriginal,
        sales_tax_original: salesTaxOriginal,
        total_original: originalTotal,

        import_duties_clp: importDuties,
        customs_fee_clp: customsFee,
        handling_fee_clp: handlingFee,
        paypal_variation_clp: paypalVariation,
        other_costs_clp: otherCosts,

        notes: form.notes || '',
        update_prices_on_receive: Boolean(form.update_prices_on_receive),

        items: form.items.map((item) => ({
          product: item.product,
          raw_description: item.name,
          normalized_card_name: item.name,
          quantity_ordered: Number(item.quantity_ordered || 0),
          quantity_received: 0,
          unit_price_original: Number(item.unit_price_original || 0),
          line_total_original: buildItemSubtotal(item),
          suggested_sale_price_clp:
            item.suggested_sale_price_clp || item.suggested?.suggested_price_clp || 0,
          sale_price_to_apply_clp:
            item.sale_price_to_apply_clp ||
            item.suggested_sale_price_clp ||
            item.suggested?.suggested_price_clp ||
            0,
        })),
      };

      await api.createPurchaseOrder(payload);

      notyf.success(
        status === 'DRAFT'
          ? 'Orden guardada como borrador.'
          : 'Orden guardada como enviada.'
      );

      resetForm();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setIsSaving(false);
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Órdenes de compra</h2>
          <p className="text-muted mb-0">
            Gestiona compras a proveedores, recepción de stock, lotes FIFO y Kardex.
          </p>
          <p className="text-info mb-0 small">
            Para ingresar productos desde proveedores, importa una orden de compra Excel. Los productos se crearán o vincularán automáticamente.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((value) => !value)}
          >
            {showForm ? 'Ocultar formulario' : 'Crear orden'}
          </button>

          <Link
            className="btn btn-outline-primary"
            to="/admin/ordenes-compra/importar"
          >
            Importar Excel
          </Link>

          <LoadingButton className="btn btn-outline-secondary" onClick={load} loading={loading} loadingText="Actualizando...">Actualizar</LoadingButton>
        </div>
      </div>

      {showForm && (
        <div className="card card-body mb-4">
          <h5>Nueva orden de compra general/manual</h5>

          <div className="alert alert-info">
            <strong>Modo actual:</strong> Productos generales/manual. Para flujo de singles desde Excel usa el botón <em>Importar Excel</em>.
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="form-label">Tipo de orden</label>
              <select
                className="form-select"
                value={form.purchase_order_type}
                onChange={(event) => updateForm('purchase_order_type', event.target.value)}
              >
                <option value="general">Productos generales/manual</option>
                <option value="singles">Singles desde Excel</option>
                <option value="mixed">Mixta</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Proveedor</label>
              <select
                className="form-select"
                value={form.supplier}
                onChange={(event) => updateForm('supplier', event.target.value)}
              >
                <option value="">Seleccione proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Número de orden</label>
              <input
                className="form-control"
                placeholder="PO-20260501-0001"
                value={form.order_number}
                onChange={(event) => updateForm('order_number', event.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Moneda</label>
              <select
                className="form-select"
                value={form.original_currency}
                onChange={(event) => {
                  const nextCurrency = event.target.value;

                  setForm((current) => {
                    if (current.original_currency === nextCurrency) return current;

                    const shouldRecalculate = current.items.length === 0
                      ? true
                      : window.confirm('Cambiar la moneda recalculará los costos unitarios.');

                    if (!shouldRecalculate) return current;

                    const updatedItems = current.items.map((item) => {
                      const sourceProduct = products.find((product) => product.id === item.product_id) || item.source_product || {};
                      const nextUnitCost = getProductUnitCostForOrder(sourceProduct, nextCurrency);

                      return {
                        ...item,
                        unit_price_original: String(nextUnitCost || 0),
                        subtotal_clp: toNumber(item.quantity_ordered) * toNumber(nextUnitCost),
                      };
                    });

                    return {
                      ...current,
                      original_currency: nextCurrency,
                      items: updatedItems,
                    };
                  });
                }}
              >
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Tienda / origen</label>
              <input
                className="form-control"
                placeholder="Card Kingdom, TCGPlayer, etc."
                value={form.source_store}
                onChange={(event) => updateForm('source_store', event.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Referencia externa</label>
              <input
                className="form-control"
                placeholder="N° pedido proveedor"
                value={form.external_reference}
                onChange={(event) =>
                  updateForm('external_reference', event.target.value)
                }
              />
            </div>

            <div className="col-md-8">
              <label className="form-label">Notas</label>
              <input
                className="form-control"
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
              />
            </div>
          </div>

          <label className="form-label">Agregar productos</label>
          <ProductAutocomplete
            products={products}
            onSelect={addItem}
            placeholder="Buscar por nombre de producto..."
          />

          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>{`Costo unitario compra (${String(form.original_currency || 'CLP').toUpperCase()})`}</th>
                  <th>{`Subtotal compra (${String(form.original_currency || 'CLP').toUpperCase()})`}</th>
                  <th>Precio sugerido venta</th>
                  <th>Precio venta a aplicar</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {form.items.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      Aún no has agregado productos.
                    </td>
                  </tr>
                )}

                {form.items.map((item, index) => (
                  <tr key={item.product_id}>
                    <td>{item.name}</td>

                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={item.quantity_ordered}
                        onChange={(event) =>
                          updateItem(index, {
                            quantity_ordered: event.target.value,
                            subtotal_clp:
                              toNumber(event.target.value) *
                              toNumber(item.unit_price_original),
                          })
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={item.unit_price_original}
                        onChange={(event) => {
                          const value = event.target.value;

                          const estimatedSuggested = estimateSuggestedPrice(value);

                          updateItem(index, {
                            unit_price_original: value,
                            subtotal_clp: toNumber(item.quantity_ordered) * toNumber(value),
                            suggested_sale_price_clp: estimatedSuggested,
                          });

                          fetchSuggested(index, value);
                        }}
                      />
                    </td>

                    <td>{formatMoney(buildItemSubtotal(item), form.original_currency)}</td>

                    <td>
                      {(item.suggested || item.suggested_sale_price_clp) ? (
                        <div>
                          <strong className="text-success">
                            {formatMoney(item.suggested_sale_price_clp || item.suggested?.suggested_price_clp || 0)}
                          </strong>

                          <div className="small text-muted">
                            Mínimo:{' '}
                            {formatMoney(item.suggested?.min_price_clp || 0)}
                          </div>

                          {item.current_price > 0 &&
                            (item.suggested?.min_price_clp || 0) > 0 &&
                            item.current_price < (item.suggested?.min_price_clp || 0) && (
                              <div className="small text-danger">
                                Precio actual bajo margen mínimo
                              </div>
                            )}

                          {toNumber(item.suggested_sale_price_clp || item.suggested?.suggested_price_clp) > 0 &&
                            toNumber(item.suggested_sale_price_clp || item.suggested?.suggested_price_clp) <
                              toNumber(item.unit_price_original) && (
                              <span className="badge text-bg-warning">Sugerido menor al costo</span>
                            )}

                          {!toNumber(item.unit_price_original) && (
                            <div className="small text-warning">Ingrese costo unitario de compra.</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {!toNumber(item.unit_price_original) && (
                            <div className="small text-warning">Ingrese costo unitario de compra.</div>
                          )}
                          {toNumber(item.suggested_sale_price_clp) > 0 &&
                            toNumber(item.suggested_sale_price_clp) <
                              toNumber(item.unit_price_original) && (
                              <span className="badge text-bg-warning">
                                Sugerido menor al costo
                              </span>
                            )}
                        </div>
                      )}
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={item.sale_price_to_apply_clp || 0}
                        onChange={(event) =>
                          updateItem(index, {
                            sale_price_to_apply_clp: Number(event.target.value || 0),
                          })
                        }
                      />
                    </td>

                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          onClick={() =>
                            updateItem(index, {
                              sale_price_to_apply_clp:
                                item.suggested_sale_price_clp ||
                                item.suggested?.suggested_price_clp ||
                                0,
                            })
                          }
                        >
                          Aplicar sugerido de venta
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeItem(index)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-check my-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="update-prices-on-receive"
              checked={form.update_prices_on_receive}
              onChange={(event) =>
                updateForm('update_prices_on_receive', event.target.checked)
              }
            />

            <label
              className="form-check-label"
              htmlFor="update-prices-on-receive"
            >
              Actualizar precios de venta al recibir orden
            </label>
          </div>

          <div className="row g-2 mt-2">
            <div className="col-md-2">
              <label className="form-label">Envío original</label>
              <input
                type="number"
                className="form-control"
                value={form.shipping_original}
                onChange={(event) =>
                  updateForm('shipping_original', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Impuesto original</label>
              <input
                type="number"
                className="form-control"
                value={form.sales_tax_original}
                onChange={(event) =>
                  updateForm('sales_tax_original', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Aduana CLP</label>
              <input
                type="number"
                className="form-control"
                value={form.import_duties_clp}
                onChange={(event) =>
                  updateForm('import_duties_clp', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Customs fee CLP</label>
              <input
                type="number"
                className="form-control"
                value={form.customs_fee_clp}
                onChange={(event) =>
                  updateForm('customs_fee_clp', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Handling CLP</label>
              <input
                type="number"
                className="form-control"
                value={form.handling_fee_clp}
                onChange={(event) =>
                  updateForm('handling_fee_clp', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">PayPal var. CLP</label>
              <input
                type="number"
                className="form-control"
                value={form.paypal_variation_clp}
                onChange={(event) =>
                  updateForm('paypal_variation_clp', event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Otros costos CLP</label>
              <input
                type="number"
                className="form-control"
                value={form.other_costs_clp}
                onChange={(event) =>
                  updateForm('other_costs_clp', event.target.value)
                }
              />
            </div>

            <div className="col-md-10">
              <div className="alert alert-info mt-4 mb-0">
                Subtotal productos: <strong>{formatMoney(subtotalOriginal)}</strong>
                <br />
                Envío original: <strong>{formatMoney(shippingOriginal)}</strong>
                <br />
                Impuesto original: <strong>{formatMoney(salesTaxOriginal)}</strong>
                <br />
                Total origen: <strong>{formatMoney(originalTotal)}</strong>
                <br />
                Costos extra CLP:{' '}
                <strong>{formatMoney(extraCostsClp)}</strong>
                <div className="small mt-2">
                  El backend recalcula los totales reales usando la moneda y el
                  tipo de cambio configurado.
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={isSaving}
              onClick={() => save('DRAFT')}
            >
              {isSaving ? 'Guardando orden...' : 'Guardar borrador'}
            </button>

            <button
              type="button"
              className="btn btn-success"
              disabled={isSaving}
              onClick={() => save('SENT')}
            >
              {isSaving ? 'Guardando orden...' : 'Guardar y enviar'}
            </button>

            <button
              type="button"
              className="btn btn-outline-danger"
              disabled={isSaving}
              onClick={resetForm}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Número</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Faltantes</th>
              <th>Total real</th>
              <th>Fecha</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  Cargando órdenes de compra...
                </td>
              </tr>
            )}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No hay órdenes de compra registradas.
                </td>
              </tr>
            )}

            {!loading &&
              orders.map((order) => {
                const missingProductsCount = getMissingProductsCount(order);
                const canReceive = canReceiveOrder(order);
                const creatingMissing = creatingMissingId === order.id;
                const receiving = receivingId === order.id;

                return (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.supplier_name}</td>

                    <td>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>

                    <td>
                      {missingProductsCount > 0 ? (
                        <span className="badge badge-error">
                          {missingProductsCount} sin producto
                        </span>
                      ) : (
                        <span className="badge badge-success">OK</span>
                      )}
                    </td>

                    <td>{formatMoney(order.real_total_clp ?? order.grand_total_clp)}</td>
                    <td>{formatDate(order.created_at)}</td>

                    <td className="text-end">
                      <div className="d-flex justify-content-end flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          disabled={loadingDetailId === order.id}
                          onClick={() => handleViewDetail(order.id)}
                        >
                          {loadingDetailId === order.id ? 'Cargando...' : 'Ver detalle'}
                        </button>

                        {order.status !== 'RECEIVED' &&
                          order.status !== 'CANCELLED' && (
                            <>
                              {missingProductsCount > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  disabled={creatingMissing || receiving}
                                  onClick={() => createMissingProducts(order.id)}
                                >
                                  {creatingMissing
                                    ? 'Creando productos...'
                                    : `Crear faltantes (${missingProductsCount})`}
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={!canReceive || receiving || creatingMissing}
                                onClick={() => receive(order.id)}
                                title={
                                  missingProductsCount > 0
                                    ? `Faltan ${missingProductsCount} productos por vincular`
                                    : 'Recibir orden'
                                }
                              >
                                {receiving
                                  ? 'Recibiendo...'
                                  : missingProductsCount > 0
                                    ? 'No recibible'
                                    : 'Marcar recibida'}
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showModal && selectedOrder && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content bg-dark text-white border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">
                  Orden {selectedOrder.order_number}
                </h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Cerrar"
                  onClick={() => setShowModal(false)}
                />
              </div>

              <div className="modal-body">
                {getMissingProductsCount(selectedOrder) > 0 && (
                  <div className="alert alert-warning">
                    Esta orden tiene{' '}
                    <strong>{getMissingProductsCount(selectedOrder)}</strong>{' '}
                    ítems sin producto vinculado. Debes resolverlos antes de recibir.
                  </div>
                )}

                <div className="alert alert-info">
            <strong>Modo actual:</strong> Productos generales/manual. Para flujo de singles desde Excel usa el botón <em>Importar Excel</em>.
          </div>

          <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <strong>Proveedor:</strong> {selectedOrder.supplier_name}
                  </div>

                  <div className="col-md-6">
                    <strong>Estado:</strong>{' '}
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </div>

                  <div className="col-md-6">
                    <strong>Creada:</strong> {formatDateTime(selectedOrder.created_at)}
                  </div>

                  <div className="col-md-6">
                    <strong>Moneda:</strong> {selectedOrder.original_currency}
                  </div>

                  <div className="col-md-6">
                    <strong>TC snapshot (CLP):</strong>{' '}
                    {selectedOrder.exchange_rate_snapshot_clp ?? '—'}
                  </div>

                  <div className="col-md-12">
                    <strong>Notas:</strong> {selectedOrder.notes || '—'}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-dark table-striped table-sm">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Vinculado</th>
                        <th>Cantidad pedida</th>
                        <th>Cantidad recibida</th>
                        <th>Costo unitario real</th>
                        <th>Subtotal CLP</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedOrder.items || []).map((item, index) => (
                        <tr key={`${item.id || item.product || 'item'}-${index}`}>
                          <td>
                            {item.product_name ||
                              item.normalized_card_name ||
                              item.raw_description ||
                              '—'}
                          </td>

                          <td>
                            {item.product ? (
                              <span className="badge badge-success">Sí</span>
                            ) : (
                              <span className="badge badge-error">No</span>
                            )}
                          </td>

                          <td>{item.quantity_ordered}</td>
                          <td>{item.quantity_received}</td>

                          <td>
                            {formatMoney(
                              item.real_unit_cost_clp || item.unit_price_clp || 0
                            )}
                          </td>

                          <td>{formatMoney(item.line_total_clp || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {getMissingProductsCount(selectedOrder) > 0 &&
                  selectedOrder.status !== 'RECEIVED' &&
                  selectedOrder.status !== 'CANCELLED' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-warning"
                        disabled={creatingMissingId === selectedOrder.id}
                        onClick={() => createMissingProducts(selectedOrder.id)}
                      >
                        {creatingMissingId === selectedOrder.id
                          ? 'Creando productos...'
                          : `Crear productos faltantes (${getMissingProductsCount(selectedOrder)})`}
                      </button>
                    </div>
                  )}

                <hr className="border-secondary" />

                <div className="row g-2">
                  <div className="col-md-6">
                    <strong>Subtotal CLP:</strong>{' '}
                    {formatMoney(selectedOrder.subtotal_clp)}
                  </div>

                  <div className="col-md-6">
                    <strong>Envío CLP:</strong>{' '}
                    {formatMoney(selectedOrder.shipping_clp)}
                  </div>

                  <div className="col-md-6">
                    <strong>Sales tax CLP:</strong>{' '}
                    {formatMoney(selectedOrder.sales_tax_clp)}
                  </div>

                  <div className="col-md-6">
                    <strong>Costos extra CLP:</strong>{' '}
                    {formatMoney(selectedOrder.total_extra_costs_clp)}
                  </div>

                  <div className="col-md-6">
                    <strong>Total origen CLP:</strong>{' '}
                    {formatMoney(selectedOrder.total_origin_clp)}
                  </div>

                  <div className="col-md-6">
                    <strong>Total real CLP:</strong>{' '}
                    {formatMoney(selectedOrder.real_total_clp)}
                  </div>
                </div>

                <h5 className="mt-3">
                  Total real: {formatMoney(selectedOrder.real_total_clp)}
                </h5>

                <p className="small text-info">
                  El costo real incluye productos, envío, impuestos y costos extra
                  asignados a la orden.
                </p>
              </div>

              <div className="modal-footer border-secondary">
                <button
                  type="button"
                  className="btn btn-outline-light"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>

                {selectedOrder.status !== 'RECEIVED' &&
                  selectedOrder.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={
                        !canReceiveOrder(selectedOrder) ||
                        receivingId === selectedOrder.id ||
                        creatingMissingId === selectedOrder.id
                      }
                      onClick={() => receive(selectedOrder.id)}
                    >
                      {receivingId === selectedOrder.id
                        ? 'Recibiendo...'
                        : getMissingProductsCount(selectedOrder) > 0
                          ? 'No recibible'
                          : 'Marcar recibida'}
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LoadingOverlay show={isCreatingOrder} blocking title="Creando orden de compra" message="Guardando encabezado e ítems de la orden." steps={['Validando formulario','Preparando payload','Guardando orden','Actualizando listado']} currentStep={2} />
      <LoadingOverlay show={isCreatingMissingProducts} blocking title="Creando productos faltantes" message="Estamos creando o vinculando singles desde Scryfall. Este proceso puede tardar." steps={['Revisando ítems sin producto','Consultando Scryfall','Creando productos','Vinculando ítems a la orden','Actualizando resumen']} currentStep={2} />
      <LoadingOverlay show={isReceivingOrder} blocking title="Recibiendo orden de compra" message="Calculando costos reales, actualizando stock, lotes FIFO y Kardex." steps={['Validando ítems','Calculando costos reales','Creando lotes FIFO','Actualizando stock','Registrando Kardex']} currentStep={2} />
      <LoadingOverlay show={isRefreshing} blocking title="Cargando órdenes de compra" message="Actualizando listados y datos relacionados." />
    </div>
  );
}
