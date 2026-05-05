import { Link } from 'react-router-dom';

const placeholderImage = 'https://placehold.co/640x420?text=Sin+imagen';

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const getCard = (product) => {
  return product?.single_card?.mtg_card || product?.mtg_card || null;
};

const getImage = (product, card) => {
  return (
    product?.image ||
    card?.image_small ||
    card?.image_normal ||
    card?.image_large ||
    placeholderImage
  );
};

const getCondition = (product) => {
  return product?.single_card?.condition || product?.condition || '';
};

const getIsFoil = (product) => {
  if (product?.single_card && typeof product.single_card.is_foil === 'boolean') {
    return product.single_card.is_foil;
  }

  return Boolean(product?.is_foil);
};

const getSetCode = (product, card) => {
  return (
    card?.set_code ||
    card?.set ||
    product?.single_card?.edition ||
    product?.edition ||
    'N/A'
  );
};

export default function ProductCard({ product, onAdd }) {
  const stock = Number(product.stock || 0);
  const card = getCard(product);
  const condition = getCondition(product);
  const isFoil = getIsFoil(product);
  const setCode = getSetCode(product, card);
  const price = product.computed_price_clp || product.price_clp;

  return (
    <div className="card product-card h-100">
      <div className="product-card-image-wrapper">
        <img
          src={getImage(product, card)}
          className="product-card-image"
          alt={product.name}
        />
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1">{product.name}</h5>

        <div className="mb-2 d-flex gap-2 flex-wrap">
          <span className="badge badge-soft">
            {product.product_type || 'producto'}
          </span>

          <span className="badge badge-soft">
            {String(setCode).toUpperCase()}
          </span>

          {condition && (
            <span className="badge badge-soft">
              {condition}
            </span>
          )}

          {product.product_type === 'single' && (
            <span className={`badge ${isFoil ? 'badge-warning' : 'badge-success'}`}>
              {isFoil ? 'Foil' : 'Non-foil'}
            </span>
          )}
        </div>

        <div className="mt-auto pt-2">
          <p className="price-highlight mb-1">
            {formatMoney(price)}
          </p>

          <small
            className={`d-block mb-3 ${stock > 0 ? 'text-success' : 'text-danger'
              }`}
          >
            Stock: {stock}
          </small>

          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-primary btn-sm"
              to={`/productos/${product.id}`}
            >
              Ver detalle
            </Link>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onAdd?.(product, 1)}
              disabled={stock <= 0 || product.is_active === false}
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}