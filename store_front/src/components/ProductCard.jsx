import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAdd }) {
  const isDigital = product.product_type === 'digital';
  const stock = Number(product.stock || 0);

  return (
    <div className="card product-card h-100 border-0">
      <img src={product.image || 'https://placehold.co/640x420?text=Sin+imagen'} className="card-img-top product-cover" alt={product.name} />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
          <h5 className="card-title mb-0">{product.name}</h5>
          <span className="badge text-bg-light border">{product.category?.name || 'Sin categoría'}</span>
        </div>
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <span className={`badge ${isDigital ? 'text-bg-dark' : 'text-bg-info'}`}>{isDigital ? 'Digital' : 'Físico'}</span>
          {product.featured ? <span className="badge text-bg-warning">Destacado</span> : null}
        </div>
        <p className="text-muted small flex-grow-1">{product.description?.slice(0, 90) || 'Sin descripción disponible.'}</p>
        <p className="fw-bold fs-5 mb-1">${product.price}</p>
        {isDigital ? <small className="text-muted mb-2">Entrega digital inmediata</small> : <small className={`mb-2 ${stock > 0 ? 'text-success' : 'text-danger'}`}>Stock disponible: {stock}</small>}
        <div className="d-flex gap-2 mt-auto">
          <Link className="btn btn-outline-primary btn-sm" to={`/products/${product.id}`}><i className="bi bi-eye me-1" />Ver detalle</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdd(product, isDigital ? 1 : 1)} disabled={!isDigital && stock <= 0}><i className="bi bi-cart-plus me-1" />Agregar al carrito</button>
        </div>
      </div>
    </div>
  );
}
