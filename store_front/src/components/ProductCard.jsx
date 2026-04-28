import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAdd }) {
  const isDigital = product.product_type === 'digital';
  const stock = Number(product.stock || 0);

  return (
    <div className="card product-card h-100">
      <img
        src={product.image || 'https://placehold.co/500x320?text=Producto'}
        className="card-img-top"
        alt={product.name}
      />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{product.name}</h5>
          {isDigital ? <span className="badge text-bg-dark">Single Digital</span> : null}
        </div>
        <p className="text-muted small flex-grow-1">{product.description?.slice(0, 100)}</p>
        <p className="fw-bold mb-2">${product.price}</p>
        {!isDigital ? (
          <small className={`d-block mb-2 ${stock > 0 ? 'text-success' : 'text-danger'}`}>
            {stock > 0 ? `Stock disponible: ${stock}` : 'Sin stock'}
          </small>
        ) : null}
        <div className="d-flex gap-2 mt-auto">
          <Link className="btn btn-outline-primary btn-sm" to={`/products/${product.id}`}>
            <i className="bi bi-eye me-1" /> Ver
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onAdd(product)}
            disabled={!isDigital && stock <= 0}
          >
            <i className="bi bi-cart-plus me-1" /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
