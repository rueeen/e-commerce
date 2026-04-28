export default function CartItem({ item, onUpdate, onRemove }) {
  const isDigital = item.product_type === 'digital';
  const stock = Number(item.stock || 0);

  return (
    <tr>
      <td>{item.name}</td>
      <td>${item.price}</td>
      <td>
        <input
          type="number"
          min="1"
          className="form-control form-control-sm"
          value={item.quantity}
          onChange={(e) => onUpdate(item.product_id, Number(e.target.value))}
          disabled={isDigital}
        />
        {!isDigital && item.quantity > stock ? <small className="text-danger">Supera stock</small> : null}
      </td>
      <td>${item.subtotal}</td>
      <td>
        <button className="btn btn-outline-danger btn-sm" onClick={() => onRemove(item.product_id)}>
          <i className="bi bi-trash" />
        </button>
      </td>
    </tr>
  );
}
