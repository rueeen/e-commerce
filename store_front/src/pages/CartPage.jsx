import { useState } from 'react';
import { api } from '../api/endpoints';
import CartItem from '../components/CartItem';
import ConfirmModal from '../components/ConfirmModal';
import { notyf } from '../api/notifier';
import { submitWebpayForm } from '../utils/webpay';
import { useCart } from '../hooks/useCart';

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

export default function CartPage() {
  const { items, total, updateItem, removeItem, clear, fetchCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingData, setShippingData] = useState({
    recipient_name: '',
    recipient_phone: '',
    shipping_street: '',
    shipping_number: '',
    shipping_commune: '',
    shipping_region: '',
    shipping_notes: '',
  });

  const handleShippingChange = (event) => {
    const { name, value } = event.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
  };

  const createOrder = async () => {
    if (!items.length) {
      notyf.error('Tu carrito está vacío.');
      return;
    }

    setCheckingOut(true);

    try {
      const { data } = await api.createOrderFromCart(shippingData);
      const payment = await api.createWebpayTransaction(data.id);
      submitWebpayForm(payment.url, payment.token);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Carrito</h2>
          <p className="text-muted mb-0">
            Revisa tus productos antes de pagar con Webpay.
          </p>
        </div>
      </div>

      <div className="panel-card p-3">
        <h5 className="mb-3">Dirección de despacho</h5>
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label">Nombre destinatario</label>
            <input className="form-control" name="recipient_name" value={shippingData.recipient_name} onChange={handleShippingChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Teléfono destinatario</label>
            <input className="form-control" name="recipient_phone" value={shippingData.recipient_phone} onChange={handleShippingChange} />
          </div>
          <div className="col-md-8">
            <label className="form-label">Calle</label>
            <input className="form-control" name="shipping_street" value={shippingData.shipping_street} onChange={handleShippingChange} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Número</label>
            <input className="form-control" name="shipping_number" value={shippingData.shipping_number} onChange={handleShippingChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Comuna</label>
            <input className="form-control" name="shipping_commune" value={shippingData.shipping_commune} onChange={handleShippingChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Región</label>
            <input className="form-control" name="shipping_region" value={shippingData.shipping_region} onChange={handleShippingChange} />
          </div>
          <div className="col-12">
            <label className="form-label">Notas</label>
            <textarea className="form-control" rows="2" name="shipping_notes" value={shippingData.shipping_notes} onChange={handleShippingChange} />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    Tu carrito está vacío.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <CartItem
                  key={item.id || item.product}
                  item={item}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
          <h4 className="mb-0">Total: {formatMoney(total)}</h4>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-danger"
              data-bs-toggle="modal"
              data-bs-target="#clearCartModal"
              disabled={!items.length || checkingOut}
            >
              Vaciar carrito
            </button>

            <button
              type="button"
              className="btn btn-success"
              disabled={checkingOut || !items.length}
              onClick={createOrder}
            >
              {checkingOut ? 'Iniciando pago...' : 'Pagar con Webpay'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        id="clearCartModal"
        title="Vaciar carrito"
        text="¿Seguro que deseas eliminar todos los productos?"
        onConfirm={clear}
      />
    </>
  );
}
