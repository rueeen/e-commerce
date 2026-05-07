import { Link } from 'react-router-dom';

const placeholderImage = 'https://placehold.co/640x420?text=Sin+imagen';

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const getProductTypeValue = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type_data?.slug ||
  product?.product_type_detail?.slug ||
  product?.product_type ||
  '';

const getProductTypeLabel = (product) =>
  product?.product_type_name ||
  product?.product_type?.name ||
  product?.product_type_data?.name ||
  product?.product_type_detail?.name ||
  product?.product_type_display ||
  product?.product_type ||
  'Producto';

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

const getBadges = (product, card, isSingle, productTypeLabel) => {
  const setCode = getSetCode(product, card);
  const condition = getCondition(product);
  const language = getLanguage(product, card);
  const isFoil = getIsFoil(product);

  if (isSingle) {
    return [
      productTypeLabel,
      setCode ? String(setCode).toUpperCase() : null,
      condition || null,
      language ? String(language).toUpperCase() : null,
      isFoil ? 'Foil' : 'Non-foil',
    ].filter(Boolean);
  }

  const typeValue = getProductTypeValue(product);
  const extraBadge =
    product?.brand ||
    product?.subcategory ||
    product?.short_description ||
    product?.edition ||
    null;

  const sealedBadge = typeValue === 'sealed' ? 'Sellado' : null;

  return [productTypeLabel, setCode ? String(setCode).toUpperCase() : null, sealedBadge, extraBadge]
    .filter(Boolean)
    .slice(0, 4);
};

export default function ProductCard({ product, onAdd }) {
  const stock = Number(product?.stock || 0);
  const card = getCard(product);
  const price = product?.computed_price_clp || product?.price_clp;
  const productType = getProductTypeValue(product);
  const productTypeLabel = getProductTypeLabel(product);
  const isSingle = productType === 'single';
  const isService = productType === 'service';
  const badges = getBadges(product, card, isSingle, productTypeLabel);
  const canBuy = product?.is_active !== false && (isService || stock > 0);

  return (
    <div className="card product-card h-100">
      <div className="product-card-image-wrapper">
        <img
          src={getImage(product, card)}
          className="product-card-image"
          alt={product?.name || 'Producto'}
        />
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-1">{product?.name || 'Producto sin nombre'}</h5>

        <div className="mb-2 d-flex gap-2 flex-wrap">
          {badges.map((badge) => (
            <span key={`${product?.id}-${badge}`} className="badge badge-soft">
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2">
          <p className="price-highlight mb-1">
            {formatMoney(price)}
          </p>

          {!isService && (
            <small className={`d-block mb-3 ${stock > 0 ? 'text-success' : 'text-danger'}`}>
              Stock: {stock}
            </small>
          )}

          {isService && (
            <small className="d-block mb-3 text-info">
              Servicio por encargo
            </small>
          )}

          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-primary btn-sm"
              to={`/productos/${product?.id}`}
            >
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
