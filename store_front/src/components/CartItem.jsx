import { formatMoney } from '../utils/format';

const getCartItemProduct = (item) => {
  if (item.product_detail && typeof item.product_detail === 'object') {
    return item.product_detail;
  }

  if (item.product_data && typeof item.product_data === 'object') {
    return item.product_data;
  }

  if (item.product_obj && typeof item.product_obj === 'object') {
    return item.product_obj;
  }

  if (item.product && typeof item.product === 'object') {
    return item.product;
  }

  return {};
};

const getCartItemPrice = (item) => {
  const product = getCartItemProduct(item);

  const unitPriceClp = Number(item.unit_price_clp ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);

  if (unitPriceClp > 0) return unitPriceClp;
  if (unitPrice > 0) return unitPrice;

  const productPrice = Number(product.price_clp ?? 0);
  const computedPrice = Number(product.computed_price_clp ?? 0);
  const suggestedPrice = Number(product.suggested_price_clp ?? 0);

  if (productPrice > 0) return productPrice;
  if (computedPrice > 0) return computedPrice;
  if (suggestedPrice > 0) return suggestedPrice;

  return Number(item.price_clp ?? item.price ?? 0);
};

const getCartItemSubtotal = (item, quantity) => {
  const unitPrice = getCartItemPrice(item);

  const subtotalClp = Number(item.subtotal_clp ?? 0);
  const subtotal = Number(item.subtotal ?? 0);

  if (subtotalClp > 0) return subtotalClp;
  if (subtotal > 0) return subtotal;

  return unitPrice * quantity;
};

const getProductId = (item) => {
  const product = getCartItemProduct(item);

  if (product?.id) return product.id;

  if (typeof item.product === 'number' || typeof item.product === 'string') {
    return item.product;
  }

  return null;
};

export default function CartItem({ item, onUpdate, onRemove, disabled = false }) {
  const quantity = Number(item.quantity || 1);
  const unitPrice = getCartItemPrice(item);
  const subtotal = getCartItemSubtotal(item, quantity);
  const productId = getProductId(item);
  const product = getCartItemProduct(item);

  const handleQuantityChange = (event) => {
    const nextQuantity = Math.max(1, Number(event.target.value || 1));
    onUpdate(item.id, nextQuantity);
  };

  return (
    <tr>
      <td>
        <div className="fw-semibold">
          {item.product_name || product?.name || 'Producto'}
        </div>

        {productId && (
          <small className="text-muted">ID producto: {productId}</small>
        )}
      </td>

      <td>{formatMoney(unitPrice)}</td>

      <td style={{ maxWidth: 120 }}>
        <label
          htmlFor={`qty-${item.id}`}
          className="visually-hidden"
        >
          Cantidad de {item.product_name || product?.name || 'producto'}
        </label>
        <input
          id={`qty-${item.id}`}
          type="number"
          min="1"
          className="form-control form-control-sm"
          value={quantity}
          onChange={handleQuantityChange}
          disabled={disabled}
        />
      </td>

      <td>{formatMoney(subtotal)}</td>

      <td className="text-end">
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          aria-label={`Eliminar ${item.product_name || product?.name || 'producto'} del carrito`}
        >
          <i className="bi bi-trash" />
        </button>
      </td>
    </tr>
  );
}
