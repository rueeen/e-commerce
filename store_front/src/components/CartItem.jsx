const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

export default function CartItem({ item, onUpdate, onRemove, disabled = false }) {
  const quantity = Number(item.quantity || 1);
  const unitPrice = item.unit_price_clp ?? item.unit_price ?? 0;
  const subtotal = item.subtotal_clp ?? item.subtotal ?? unitPrice * quantity;

  const handleQuantityChange = (event) => {
    const nextQuantity = Math.max(1, Number(event.target.value || 1));
    onUpdate(item.id, nextQuantity);
  };

  return (
    <tr>
      <td>
        <div className="fw-semibold">{item.product_name || 'Producto'}</div>
        {item.product && (
          <small className="text-muted">ID producto: {item.product}</small>
        )}
      </td>

      <td>{formatMoney(unitPrice)}</td>

      <td style={{ maxWidth: 120 }}>
        <input
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
          aria-label={`Eliminar ${item.product_name || 'producto'} del carrito`}
        >
          <i className="bi bi-trash" />
        </button>
      </td>
    </tr>
  );
}