import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAdd }) {
  const stock = Number(product.stock || 0);
  return (
    <div className="card product-card h-100">
      <div className="product-card-image-wrapper">
        <img src={product.image || product.mtg_card?.image_small || 'https://placehold.co/640x420?text=Sin+imagen'} className="product-card-image" alt={product.name} />
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1">{product.name}</h5>
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <span className="badge badge-soft">{product.product_type}</span>
          <span className="badge badge-soft">{product.mtg_card?.set_code || product.edition || 'N/A'}</span>
          <span className="badge badge-soft">{product.condition}</span>
          <span className={`badge ${product.is_foil ? 'badge-warning' : 'badge-success'}`}>{product.is_foil ? 'Foil' : 'Non-foil'}</span>
        </div>
        <div className="mt-auto pt-2">
          <p className="price-highlight mb-1">CLP ${product.price_clp}</p>
          <small className={`d-block mb-3 ${stock > 0 ? 'text-success' : 'text-danger'}`}>Stock: {stock}</small>
          <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary btn-sm" to={`/products/${product.id}`}>Ver detalle</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdd(product, 1)} disabled={stock <= 0}>Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  );
}
