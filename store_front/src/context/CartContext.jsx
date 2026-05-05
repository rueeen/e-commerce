import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import { useAuth } from '../hooks/useAuth';

export const CartContext = createContext(null);

const normalizeItems = (data) => data?.items || [];

const getItemSubtotal = (item) => {
  return Number(
    item.subtotal_clp ??
    item.subtotal ??
    Number(item.unit_price_clp || item.price || 0) * Number(item.quantity || 0)
  );
};

export function CartProvider({ children }) {
  const { isAuthenticated, initializing } = useAuth();

  const [items, setItems] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || initializing) {
      setItems([]);
      setServerTotal(0);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.cart();

      setItems(normalizeItems(data));
      setServerTotal(Number(data.total_clp || data.total || 0));
    } catch {
      setItems([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, initializing]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(
    async (product, quantity = 1) => {
      if (!isAuthenticated) {
        notyf.error('Debes iniciar sesión para agregar productos al carrito.');
        return false;
      }

      const qty = Number(quantity || 1);

      if (!product?.id) {
        notyf.error('Producto inválido.');
        return false;
      }

      if (qty <= 0) {
        notyf.error('La cantidad debe ser mayor a 0.');
        return false;
      }

      try {
        await api.addToCart({
          product_id: product.id,
          quantity: qty,
        });

        notyf.success('Producto agregado al carrito.');
        await fetchCart();
        return true;
      } catch {
        return false;
      }
    },
    [fetchCart, isAuthenticated]
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      const qty = Number(quantity || 0);

      if (qty <= 0) {
        notyf.error('La cantidad debe ser mayor a 0.');
        return false;
      }

      try {
        await api.updateCart(itemId, {
          quantity: qty,
        });

        await fetchCart();
        return true;
      } catch {
        return false;
      }
    },
    [fetchCart]
  );

  const removeItem = useCallback(
    async (itemId) => {
      try {
        await api.removeFromCart(itemId);
        notyf.success('Producto eliminado del carrito.');
        await fetchCart();
        return true;
      } catch {
        return false;
      }
    },
    [fetchCart]
  );

  const clear = useCallback(async () => {
    try {
      await api.clearCart();
      setItems([]);
      setServerTotal(0);
      notyf.success('Carrito vaciado.');
      return true;
    } catch {
      return false;
    }
  }, []);

  const total = useMemo(() => {
    if (serverTotal > 0) {
      return serverTotal;
    }

    return items.reduce((acc, item) => acc + getItemSubtotal(item), 0);
  }, [items, serverTotal]);

  const value = useMemo(
    () => ({
      items,
      loading,
      total,
      fetchCart,
      addItem,
      updateItem,
      removeItem,
      clear,
    }),
    [
      items,
      loading,
      total,
      fetchCart,
      addItem,
      updateItem,
      removeItem,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}