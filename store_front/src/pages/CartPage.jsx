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

  const createOrder = async () => {
    if (!items.length) {
      notyf.error('Tu carrito está vacío.');
      return;
    }

    setCheckingOut(true);

    try {
      const { data } = await api.createOrderFromCart();
      const payment = await api.createWebpayTransaction(data.id);
      notyf.success('Redirigiendo a Webpay...');
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