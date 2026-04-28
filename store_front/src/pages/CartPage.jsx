import { useState } from 'react';
import { api } from '../api/endpoints';
import CartItem from '../components/CartItem';
import ConfirmModal from '../components/ConfirmModal';
import { useCart } from '../hooks/useCart';
import { notyf } from '../api/notifier';

export default function CartPage() {
  const { items, total, updateItem, removeItem, clear, fetchCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const checkout = async () => {
    setCheckingOut(true);
    try {
      await api.checkout();
      notyf.success('Compra confirmada');
      await fetchCart();
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <h2>Carrito</h2>
      <div className="table-responsive">
        <table className="table align-middle">
          <thead><tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th /></tr></thead>
          <tbody>{items.map((item) => <CartItem key={item.product_id} item={item} onUpdate={updateItem} onRemove={removeItem} />)}</tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h4>Total: ${total.toFixed(2)}</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-danger" data-bs-toggle="modal" data-bs-target="#clearCartModal">Vaciar carrito</button>
          <button className="btn btn-success" disabled={checkingOut || !items.length} onClick={checkout}>Confirmar compra</button>
        </div>
      </div>
      <ConfirmModal id="clearCartModal" title="Vaciar carrito" text="¿Seguro que deseas eliminar todos los productos?" onConfirm={clear} />
    </>
  );
}
