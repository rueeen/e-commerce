import { useEffect, useRef } from 'react';
import DataTable from 'datatables.net-bs5';
import 'datatables.net-bs5/css/dataTables.bootstrap5.css';

export default function OrderTable({ orders, onView }) {
  const tableRef = useRef(null);

  useEffect(() => {
    const dt = new DataTable(tableRef.current, {
      destroy: true,
      paging: true,
      searching: true,
      language: { search: 'Buscar:' },
    });

    return () => dt.destroy();
  }, [orders]);

  return (
    <table ref={tableRef} className="table table-striped align-middle">
      <thead>
        <tr>
          <th>ID</th>
          <th>Estado</th>
          <th>Fecha</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.status}</td>
            <td>{new Date(order.created_at).toLocaleDateString()}</td>
            <td>${order.total}</td>
            <td>
              <button className="btn btn-outline-primary btn-sm" onClick={() => onView(order)} data-bs-toggle="modal" data-bs-target="#orderDetailModal">
                <i className="bi bi-receipt" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
