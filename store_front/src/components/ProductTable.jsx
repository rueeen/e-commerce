export default function ProductTable({ products, onEdit, onToggleActive, onDelete }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.name}</td><td>{p.category?.name || '-'}</td><td>{p.product_type}</td><td>${p.price}</td><td>{p.stock}</td>
              <td><span className={`badge ${p.is_active ? 'badge-success' : 'badge-soft'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
              <td className="d-flex gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => onEdit(p)}>Editar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onToggleActive(p)}>{p.is_active ? 'Desactivar' : 'Activar'}</button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(p)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
