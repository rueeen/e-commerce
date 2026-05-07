import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import AdminManualOrderModal from '../components/AdminManualOrderModal';
import { useAuth } from '../hooks/useAuth';

const statuses = [
  { value: 'pending', label: 'Pendiente' },
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
  if (status === 'paid' || status === 'delivered') {
    return 'badge-success';
  }

  if (status === 'pending' || status === 'processing' || status === 'shipped') {
    return 'badge-warning';
  }

  if (status === 'canceled') {
    return 'badge-error';
  }

  return 'badge-soft';
};

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

export default function AdminOrdersPage() {
  const { isAdmin, isWorker } = useAuth();
  const canManage = isAdmin || isWorker;
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const load = async () => {
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
    load();
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return orders.filter((order) => {
      const userText =
        typeof order.user === 'object'
          ? `${order.user?.username || ''} ${order.user?.email || ''}`
          : String(order.user || '');

      const text = `${order.id} ${userText}`.toLowerCase();

      const matchesSearch = !search || text.includes(search);
      const matchesStatus = !status || order.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [orders, q, status]);

  const confirmPayment = async (order) => {
    setActionLoadingId(order.id);

    try {
      await api.confirmOrderPayment(order.id);
      notyf.success(`Orden #${order.id} marcada como pagada.`);
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelOrder = async (order) => {
    const ok = window.confirm(`¿Seguro que quieres cancelar la orden #${order.id}?`);

    if (!ok) return;

    setActionLoadingId(order.id);

    try {
      await api.cancelOrder(order.id);
      notyf.success(`Orden #${order.id} cancelada correctamente.`);
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Pedidos</h2>
          <p className="text-muted mb-0">
            Administra órdenes generadas desde el carrito.
          </p>
        </div>

        <div className="d-flex gap-2">
          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowManualModal(true)}
            >
              Nueva orden manual
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Buscar por usuario o número de pedido"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={() => {
              setQ('');
              setStatus('');
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Subtotal</th>
              <th>Total CLP</th>
              <th>Stock</th>
              <th>Creada</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  Cargando pedidos...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  No hay pedidos para los filtros seleccionados.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((order) => {
                const userLabel =
                  typeof order.user === 'object'
                    ? order.user?.username || order.user?.email || `Usuario #${order.user?.id}`
                    : `Usuario #${order.user}`;

                const actionBusy = actionLoadingId === order.id;
                const canConfirmPayment = order.status === 'pending';
                const canCancel = ['pending', 'paid', 'processing'].includes(order.status);

                return (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{userLabel}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>{formatMoney(order.subtotal_clp)}</td>
                    <td>{formatMoney(order.total_clp)}</td>
                    <td>
                      {order.stock_consumed ? (
                        <span className="badge badge-success">Consumido</span>
                      ) : (
                        <span className="badge badge-soft">Pendiente</span>
                      )}
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="text-end">
                      {canConfirmPayment && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success me-2"
                          onClick={() => confirmPayment(order)}
                          disabled={actionBusy}
                        >
                          Confirmar pago
                        </button>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => cancelOrder(order)}
                          disabled={actionBusy}
                        >
                          Cancelar
                        </button>
                      )}

                      {!canConfirmPayment && !canCancel && (
                        <span className="text-muted small">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      </div>
      <AdminManualOrderModal
        show={showManualModal}
        onClose={() => setShowManualModal(false)}
        onCreated={load}
      />
    </>
  );
}
