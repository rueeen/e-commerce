import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAdd }) {
  const stock = Number(product.stock || 0);
  return (
    <div className="card product-card h-100 border-0">
      <img src={product.image || product.mtg_card?.image_small || 'https://placehold.co/640x420?text=Sin+imagen'} className="card-img-top product-cover" alt={product.name} />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1">{product.name}</h5>
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <span className="badge text-bg-dark">{product.product_type}</span>
          <span className="badge text-bg-light border">{product.mtg_card?.set_code || product.edition || 'N/A'}</span>
          <span className="badge text-bg-secondary">{product.condition}</span>
          <span className={`badge ${product.is_foil ? 'text-bg-warning' : 'text-bg-info'}`}>{product.is_foil ? 'Foil' : 'Non-foil'}</span>
        </div>
        <p className="text-muted small flex-grow-1">{product.mtg_card?.oracle_text?.slice(0, 100) || product.description?.slice(0, 100) || 'Sin descripción disponible.'}</p>
        <p className="fw-bold fs-5 mb-1">CLP ${product.price_clp}</p>
        <small className={`mb-2 ${stock > 0 ? 'text-success' : 'text-danger'}`}>Stock: {stock}</small>
        <div className="d-flex gap-2 mt-auto">
          <Link className="btn btn-outline-primary btn-sm" to={`/products/${product.id}`}>Ver detalle</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdd(product, 1)} disabled={stock <= 0}>Agregar al carrito</button>
        </div>
      </div>
    </div>
  );
}
