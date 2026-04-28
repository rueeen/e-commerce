import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import OrderTable from '../components/OrderTable';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.orders().then(({ data }) => setOrders(data.results || data));
  }, []);

  return (
    <>
      <h2>Administrar pedidos</h2>
      <OrderTable orders={orders} onView={setSelected} />
      <div className="modal fade" id="orderDetailModal" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Pedido #{selected?.id}</h5><button className="btn-close" data-bs-dismiss="modal" /></div>
            <div className="modal-body">
              <p>Cliente: {selected?.user?.username || selected?.user}</p>
              <p>Estado: {selected?.status}</p>
              <p>Total: ${selected?.total}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
