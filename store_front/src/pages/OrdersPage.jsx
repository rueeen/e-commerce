import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import OrderTable from '../components/OrderTable';

const normalizeList = (data) => data?.results || data || [];

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const formatDate = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('es-CL');
  } catch {
    return value;
  }
};

const getChilexpressTrackingUrl = (trackingNumber) => {
  const baseUrl = 'https://www.chilexpress.cl/views/herramientas/seguimiento';
  if (!trackingNumber) return baseUrl;
  return `${baseUrl}?tracking_number=${encodeURIComponent(trackingNumber)}`;
};

const statusLabels = {
  pending_payment: 'Pendiente de pago',
  payment_started: 'Pago iniciado',
  payment_failed: 'Pago rechazado',
  paid: 'Pagado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  completed: 'Completado',
  canceled: 'Cancelado',
  expired: 'Expirada',
  manual_review: 'En revisión',
};

const getStatusBadgeClass = (status) => {
  if (status === 'payment_failed' || status === 'expired') return 'badge-error';
  if (status === 'paid' || status === 'delivered' || status === 'completed') return 'badge-success';
  if (status === 'payment_started' || status === 'processing' || status === 'shipped') return 'badge-warning';
  if (status === 'canceled') return 'badge-soft';
  return 'badge-soft';
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptNotAvailable, setReceiptNotAvailable] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const loadOrders = async () => {
    setLoading(true);

    try {
      const { data } = await api.orders();
      setOrders(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    setReceipt(null);
    setReceiptNotAvailable(false);
    setReceiptLoading(false);
  }, [selected?.id]);

  const canShowReceipt = ['paid', 'delivered', 'completed'].includes(selected?.status);

  const loadReceipt = async () => {
    if (!selected?.id || receiptLoading) return;

    setReceiptLoading(true);
    setReceiptNotAvailable(false);

    try {
      const { data } = await api.getReceiptByOrder(selected.id);
      setReceipt(data);
    } catch (error) {
      if (error?.response?.status === 404) {
        setReceiptNotAvailable(true);
      }
      setReceipt(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Mis pedidos</h2>
          <p className="text-muted mb-0">
            Revisa el estado de tus órdenes y el detalle de los productos comprados.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={loadOrders}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">
          Cargando pedidos...
        </div>
      ) : orders.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">
          Aún no tienes pedidos registrados.
        </div>
      ) : (
        <OrderTable orders={orders} onView={setSelected} />
      )}

      <div className="modal fade" id="orderDetailModal" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content bg-dark text-white border-secondary">
            <div className="modal-header border-secondary">
              <h5 className="modal-title">
                Detalle pedido #{selected?.id || '-'}
              </h5>

              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              />
            </div>

            <div className="modal-body">
              {!selected ? (
                <p className="text-muted mb-0">Selecciona un pedido.</p>
              ) : (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <strong>Estado:</strong>{' '}
                      <span className={`badge ${getStatusBadgeClass(selected.status)}`}>
                        {statusLabels[selected.status] || selected.status}
                      </span>
                    </div>

                    <div className="col-md-6">
                      <strong>Fecha:</strong> {formatDate(selected.created_at)}
                    </div>

                    <div className="col-md-6">
                      <strong>Subtotal:</strong>{' '}
                      {formatMoney(selected.subtotal_clp)}
                    </div>

                    <div className="col-md-6">
                      <strong>Total:</strong> {formatMoney(selected.total_clp)}
                    </div>
                  </div>

                  <h6>Productos</h6>

                  <div className="table-responsive">
                    <table className="table table-dark table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Tipo</th>
                          <th>Cantidad</th>
                          <th>Precio unitario</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(selected.items || []).map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.product_name_snapshot ||
                                item.product_name ||
                                item.product?.name ||
                                'Producto'}
                            </td>
                            <td>{item.product_type_snapshot || '-'}</td>
                            <td>{item.quantity}</td>
                            <td>{formatMoney(item.unit_price_clp)}</td>
                            <td>{formatMoney(item.subtotal_clp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {['shipped', 'delivered'].includes(selected.status) ? (
                    <div className="mt-4">
                      <h6>Seguimiento de envío</h6>
                      <p className="mb-1">
                        <strong>Número de tracking:</strong>{' '}
                        {selected.tracking_number || 'Pendiente de asignación'}
                      </p>
                      <a
                        href={getChilexpressTrackingUrl(selected.tracking_number)}
                        target="_blank"
                        rel="noreferrer"
                        className="link-light"
                      >
                        Ver en Chilexpress
                      </a>
                    </div>
                  ) : null}

                  {canShowReceipt ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        className="btn btn-outline-light mb-3"
                        onClick={loadReceipt}
                        disabled={receiptLoading}
                      >
                        {receiptLoading ? 'Cargando comprobante...' : 'Ver comprobante'}
                      </button>

                      {receiptLoading ? (
                        <p className="mb-0 text-muted">Cargando comprobante...</p>
                      ) : receiptNotAvailable ? (
                        <p className="mb-0 text-warning">
                          El comprobante aún no está disponible. Intenta nuevamente en unos minutos.
                        </p>
                      ) : receipt ? (
                        <ul className="list-unstyled mb-0">
                          <li><strong>Número de documento:</strong> {receipt.document_number || '-'}</li>
                          <li><strong>Neto:</strong> {formatMoney(receipt.net_amount)}</li>
                          <li><strong>IVA (19%):</strong> {formatMoney(receipt.vat_amount)}</li>
                          <li><strong>Total:</strong> {formatMoney(receipt.total_amount)}</li>
                          <li><strong>Tipo:</strong> {receipt.document_type || '-'}</li>
                          <li><strong>Fecha de emisión:</strong> {formatDate(receipt.issued_at)}</li>
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="modal-footer border-secondary">
              <button
                type="button"
                className="btn btn-outline-light"
                data-bs-dismiss="modal"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
