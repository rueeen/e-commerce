import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import AdminManualOrderModal from '../components/AdminManualOrderModal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../hooks/useAuth';

const statuses = [
  { value: 'pending_payment', label: 'Pendiente de pago' },
  { value: 'payment_started', label: 'Pago iniciado' },
  { value: 'payment_failed', label: 'Pago rechazado' },
  { value: 'expired', label: 'Expirada' },
  { value: 'completed', label: 'Completada' },
  { value: 'manual_review', label: 'Revisión manual' },
  { value: 'paid', label: 'Pagado' },
  { value: 'processing', label: 'Procesando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'canceled', label: 'Cancelado' },
];

const getStatusLabel = (value) => {
  return statuses.find((status) => status.value === value)?.label || value;
};

const getStatusBadgeClass = (status) => {
  if (status === 'paid' || status === 'delivered') return 'badge-success';
  if (status === 'pending' || status === 'processing' || status === 'shipped') return 'badge-warning';
  if (status === 'canceled') return 'badge-error';
  return 'badge-soft';
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-CL')}`;

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

const getTotalPages = (count, pageSize, fallbackLength) => {
  if (count && pageSize) return Math.max(1, Math.ceil(count / pageSize));
  if (fallbackLength && pageSize) return Math.max(1, Math.ceil(fallbackLength / pageSize));
  return 1;
};

export default function AdminOrdersPage() {
  const { isAdmin, isWorker } = useAuth();
  const canManage = isAdmin || isWorker;

  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        search: q.trim() || undefined,
        status: status || undefined,
      };
      const { data } = await api.orders(params);
      setOrders(data?.results || []);
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
    load();
  }, [page, q, status]);

  const totalPages = useMemo(() => getTotalPages(pagination.count, 20, orders.length), [pagination.count, orders.length]);

  const resetFilters = () => {
    setQ('');
    setStatus('');
    setPage(1);
  };

  const onChangeSearch = (event) => {
    setQ(event.target.value);
    setPage(1);
  };

  const onChangeStatus = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const confirmPayment = async (order) => {
    setActionLoadingId(order.id);
    try {
      await api.confirmOrderPayment(order.id);
      notyf.success(`Orden #${order.id} marcada como pagada.`);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const updateOrderStatus = async (order, nextStatus, successMessage) => {
    setActionLoadingId(order.id);
    try {
      await api.updateOrderStatus(order.id, nextStatus);
      notyf.success(successMessage);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelOrder = (order) => {
    setCancelTargetId(order.id);
  };

  const executeCancelOrder = async () => {
    if (!cancelTargetId) return;
    setActionLoadingId(cancelTargetId);
    try {
      await api.cancelOrder(cancelTargetId);
      notyf.success(`Orden #${cancelTargetId} cancelada correctamente.`);
      await load();
    } finally {
      setActionLoadingId(null);
      setCancelTargetId(null);
    }
  };

  return (
    <>
      <div className="panel-card p-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="mb-1">Pedidos</h2>
            <p className="text-muted mb-0">Administra órdenes generadas desde el carrito.</p>
          </div>
          <div className="d-flex gap-2">
            {canManage && (
              <button type="button" className="btn btn-primary" onClick={() => setShowManualModal(true)}>
                Nueva orden manual
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" onClick={load} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <input className="form-control" placeholder="Buscar por usuario o número de pedido" value={q} onChange={onChangeSearch} />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={status} onChange={onChangeStatus}>
              <option value="">Todos los estados</option>
              {statuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <button type="button" className="btn btn-outline-secondary w-100" onClick={resetFilters}>Limpiar</button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>#</th><th>Usuario</th><th>Estado</th><th>Subtotal</th><th>Total CLP</th><th>Stock</th><th>Creada</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="text-center text-muted py-4">Cargando pedidos...</td></tr>}
              {!loading && orders.length === 0 && <tr><td colSpan="8" className="text-center text-muted py-4">No hay pedidos para los filtros seleccionados.</td></tr>}
              {!loading && orders.map((order) => {
                const userLabel = typeof order.user === 'object' ? order.user?.username || order.user?.email || `Usuario #${order.user?.id}` : `Usuario #${order.user}`;
                const actionBusy = actionLoadingId === order.id;
                const canConfirmPayment = ['pending_payment', 'payment_failed'].includes(order.status);
                const canCancel = ['pending_payment', 'payment_failed', 'paid', 'processing'].includes(order.status);
                return (
                  <tr key={order.id}>
                    <td>#{order.id}</td><td>{userLabel}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                      {order.status === 'shipped' && order.tracking_number ? (
                        <div className="mt-2">
                          <span className="badge badge-soft me-2">{order.tracking_number}</span>
                          <a
                            href={getChilexpressTrackingUrl(order.tracking_number)}
                            target="_blank"
                            rel="noreferrer"
                            className="small"
                          >
                            Ver seguimiento
                          </a>
                        </div>
                      ) : null}
                      {order.status === 'shipped' && !order.tracking_number ? (
                        <div className="mt-2 text-warning small">
                          ⚠ Despacho sin tracking — revisar Chilexpress
                        </div>
                      ) : null}
                    </td>
                    <td>{formatMoney(order.subtotal_clp)}</td><td>{formatMoney(order.total_clp)}</td>
                    <td>{order.stock_consumed ? <span className="badge badge-success">Consumido</span> : <span className="badge badge-soft">Pendiente</span>}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="text-end">
                      {canConfirmPayment && <button type="button" className="btn btn-sm btn-outline-success me-2" onClick={() => confirmPayment(order)} disabled={actionBusy}>Confirmar pago</button>}
                      {order.status === 'paid' && <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => updateOrderStatus(order, 'processing', `Orden #${order.id} en procesamiento.`)} disabled={actionBusy}>Procesar</button>}
                      {order.status === 'processing' && <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => updateOrderStatus(order, 'shipped', `Orden #${order.id} enviada.`)} disabled={actionBusy}>Enviar</button>}
                      {order.status === 'shipped' && <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => updateOrderStatus(order, 'delivered', `Orden #${order.id} marcada como entregada.`)} disabled={actionBusy}>Entregado</button>}
                      {order.status === 'delivered' && <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => updateOrderStatus(order, 'completed', `Orden #${order.id} completada.`)} disabled={actionBusy}>Completar</button>}
                      {canCancel && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cancelOrder(order)} data-bs-toggle="modal" data-bs-target="#cancelOrderModal" disabled={actionBusy}>Cancelar</button>}
                      {!canConfirmPayment && !canCancel && !['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && <span className="text-muted small">Sin acciones</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || !pagination.previous}>Anterior</button>
          <span className="text-muted">Página {page} de {totalPages}</span>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPage((p) => p + 1)} disabled={loading || !pagination.next}>Siguiente</button>
        </div>
      </div>
      <AdminManualOrderModal show={showManualModal} onClose={() => setShowManualModal(false)} onCreated={load} />
      <ConfirmModal
        id="cancelOrderModal"
        title="Cancelar orden"
        text={cancelTargetId ? `¿Seguro que quieres cancelar la orden #${cancelTargetId}?` : ''}
        confirmText="Sí, cancelar"
        confirmVariant="danger"
        onConfirm={executeCancelOrder}
      />
    </>
  );
}
