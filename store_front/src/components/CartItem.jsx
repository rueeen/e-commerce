export default function CartItem({ item, onUpdate, onRemove }) {
  return (
    <tr>
      <td>{item.product_name}</td>
      <td>${item.unit_price}</td>
      <td>
        <input
          type="number"
          min="1"
          className="form-control form-control-sm"
          value={item.quantity}
          onChange={(e) => onUpdate(item.id, Number(e.target.value))}
          disabled={false}
        />
      </td>
      <td>${item.subtotal}</td>
      <td>
        <button className="btn btn-outline-danger btn-sm" onClick={() => onRemove(item.id)}>
          <i className="bi bi-trash" />
        </button>
      </td>
    </tr>
  );
}
