import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import OrderTable from '../components/OrderTable';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.orders().then(({ data }) => setOrders(data.results || data));
  }, []);

  return (
    <>
      <h2>Mis pedidos</h2>
      <OrderTable orders={orders} onView={setSelected} />

      <div className="modal fade" id="orderDetailModal" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Detalle pedido #{selected?.id}</h5>
              <button className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <p>Estado: {selected?.status}</p>
              <p>Total: ${selected?.total_amount}</p>
              <ul>
                {selected?.items?.map((item) => <li key={item.id}>{item.product_name} x {item.quantity}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
