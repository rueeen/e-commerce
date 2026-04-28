import { createContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data } = await api.cart();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addItem = async (product, quantity = 1) => {
    await api.addToCart({ product_id: product.id, quantity });
    notyf.success('Producto agregado');
    fetchCart();
  };

  const updateItem = async (productId, quantity) => {
    await api.updateCart({ product_id: productId, quantity });
    fetchCart();
  };

  const removeItem = async (productId) => {
    await api.removeFromCart({ product_id: productId });
    notyf.success('Producto eliminado');
    fetchCart();
  };

  const clear = async () => {
    await api.clearCart();
    setItems([]);
    notyf.success('Carrito vaciado');
  };

  const total = items.reduce((acc, item) => acc + Number(item.subtotal || item.price * item.quantity), 0);

  const value = useMemo(
    () => ({ items, loading, total, fetchCart, addItem, updateItem, removeItem, clear }),
    [items, loading, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
