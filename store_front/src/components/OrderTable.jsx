import { useEffect, useRef } from 'react';
import DataTable from 'datatables.net-bs5';

import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
import { formatMoney, formatDate } from '../utils/format';

const statusLabels = {
  pending_payment: 'Pendiente de pago',
  payment_started: 'Pago iniciado',
  payment_failed: 'Pago rechazado',
  expired: 'Expirada',
  completed: 'Completada',
  manual_review: 'Revisión manual',
  paid: 'Pagado',
  processing: 'Procesando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  canceled: 'Cancelado',
};

const getStatusBadgeClass = (status) => {
  if (status === 'paid' || status === 'delivered' || status === 'completed') {
    return 'badge-success';
  }

  if (status === 'payment_started' || status === 'processing' || status === 'shipped') {
    return 'badge-warning';
  }

  if (status === 'payment_failed' || status === 'expired' || status === 'canceled') {
    return 'badge-error';
  }

  return 'badge-soft';
};

export default function OrderTable({ orders = [], onView }) {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    dataTableRef.current = new DataTable(tableRef.current, {
      paging: true,
      searching: true,
      ordering: true,
      responsive: true,
      language: {
        search: 'Buscar:',
        lengthMenu: 'Mostrar _MENU_ registros',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ pedidos',
        infoEmpty: 'No hay pedidos disponibles',
        zeroRecords: 'No se encontraron pedidos',
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
  }, [orders]);

  return (
    <div className="table-responsive">
      <table ref={tableRef} className="table table-striped align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Productos</th>
            <th className="text-end">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>

              <td>
                <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </td>

              <td>{formatDate(order.created_at)}</td>

              <td>{formatMoney(order.total_clp)}</td>

              <td>{order.items?.length || 0}</td>

              <td className="text-end">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => onView?.(order)}
                  data-bs-toggle="modal"
                  data-bs-target="#orderDetailModal"
                  aria-label={`Ver detalle del pedido ${order.id}`}
                >
                  <i className="bi bi-receipt" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}