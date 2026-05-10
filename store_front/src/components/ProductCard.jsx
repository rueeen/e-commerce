import { Link } from 'react-router-dom';
import { formatMoney } from '../utils/format';

const placeholderImage = 'https://placehold.co/640x420?text=Sin+imagen';

const getProductType = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type_data?.slug ||
  product?.product_type_detail?.slug ||
  product?.product_type ||
  'other';

const getProductTypeLabel = (type) => {
  const labels = {
    single: 'Carta individual',
    sealed: 'Producto sellado',
    bundle: 'Bundle',
    accessory: 'Accesorio',
    service: 'Servicio / encargo',
    other: 'Otro',
  };

  return labels[type] || type;
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

const getLanguage = (product, card) => {
  return product?.single_card?.language || product?.language || card?.lang || '';
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
    product?.set_code ||
    ''
  );
};

export default function ProductCard({ product, onAdd }) {
  const stock = Number(product?.stock || 0);
  const card = getCard(product);
  const price = product?.computed_price_clp || product?.price_clp;
  const type = getProductType(product);
  const typeLabel = getProductTypeLabel(type);
  const isSingle = type === 'single';
  const isService = type === 'service';
  const canBuy = product?.is_active !== false && (isService || stock > 0);

  const setCode = getSetCode(product, card);
  const condition = getCondition(product);
  const language = getLanguage(product, card);
  const isFoil = getIsFoil(product);

  const shortDescription = product?.short_description || product?.description || '';

  const cardClass = `card product-card h-100 product-card-${type || 'other'}`;
  const imageWrapperClass = `product-card-image-wrapper ${isSingle ? 'single' : 'wide'}`;

  return (
    <div className={cardClass}>
      <div className={imageWrapperClass}>
        <img
          src={getImage(product, card)}
          className="product-card-image"
          alt={product?.name || 'Producto'}
        />
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1">{product?.name || 'Producto sin nombre'}</h5>

        <div className="mb-2 d-flex gap-2 flex-wrap">
          <span className="badge badge-soft">{typeLabel}</span>
          {isSingle && setCode && <span className="badge badge-soft">{String(setCode).toUpperCase()}</span>}
          {isSingle && condition && <span className="badge badge-soft">{condition}</span>}
          {isSingle && language && <span className="badge badge-soft">{String(language).toUpperCase()}</span>}
          {isSingle && <span className="badge badge-soft">{isFoil ? 'Foil' : 'Non-foil'}</span>}
        </div>

        {!isSingle && shortDescription && (
          <p className="small text-secondary mb-3 product-card-description">{shortDescription}</p>
        )}

        {(type === 'sealed' || type === 'bundle') && (
          <p className="small text-secondary mb-3">
            {type === 'sealed' ? 'Producto sellado' : 'Bundle'}
          </p>
        )}

        <div className="mt-auto pt-2">
          <p className="price-highlight mb-1">{formatMoney(price)}</p>

          {!isService && (
            <small className={`d-block mb-3 ${stock > 0 ? 'text-success' : 'text-danger'}`}>
              Stock: {stock}
            </small>
          )}

          {isService && <small className="d-block mb-3 text-info">Servicio por encargo</small>}

          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-outline-primary btn-sm" to={`/productos/${product?.id}`}>
              Ver detalle
            </Link>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onAdd?.(product, 1)}
              disabled={!canBuy}
            >
              {isService ? 'Solicitar servicio' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
