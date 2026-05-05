import { Link } from 'react-router-dom';

const formatMoney = (value) => {
  return `$${Number(value || 0).toLocaleString('es-CL')}`;
};

const getCard = (product) => {
  return product?.single_card?.mtg_card || product?.mtg_card || null;
};

const getImage = (product, card) => {
  return (
    product?.image ||
    card?.image_large ||
    card?.image_normal ||
    card?.image_small ||
    'https://placehold.co/640x420?text=Sin+imagen'
  );
};

export default function ProductModal({ product }) {
  const card = getCard(product);
  const price = product?.computed_price_clp || product?.price_clp || 0;
  const condition = product?.single_card?.condition || product?.condition || '-';
  const language = product?.single_card?.language || product?.language || '-';
  const isFoil =
    typeof product?.single_card?.is_foil === 'boolean'
      ? product.single_card.is_foil
      : Boolean(product?.is_foil);

  return (
    <div
      className="modal fade"
      id="productModal"
      tabIndex="-1"
      aria-labelledby="productModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content bg-dark text-white border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title" id="productModalLabel">
              Detalle de producto
            </h5>

            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
            />
          </div>

          <div className="modal-body">
            {product ? (
              <div className="row g-3">
                <div className="col-md-4">
                  <img
                    src={getImage(product, card)}
                    alt={product.name}
                    className="img-fluid rounded-4"
                  />
                </div>

                <div className="col-md-8">
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className="badge badge-soft">
                      {product.product_type || 'producto'}
                    </span>

                    {product.product_type === 'single' && (
                      <>
                        <span className="badge badge-soft">{condition}</span>
                        <span className="badge badge-soft">{language}</span>
                        <span className={`badge ${isFoil ? 'badge-warning' : 'badge-success'}`}>
                          {isFoil ? 'Foil' : 'Non-foil'}
                        </span>
                      </>
                    )}
                  </div>

                  <h4>{product.name}</h4>

                  {card && (
                    <p className="text-muted mb-2">
                      {card.set_name || '-'}{' '}
                      {card.set_code ? `(${String(card.set_code).toUpperCase()})` : ''}
                      {' · '}
                      {card.rarity || 'sin rareza'}
                    </p>
                  )}

                  <p className="text-secondary">
                    {card?.oracle_text || product.description || 'Sin descripción.'}
                  </p>

                  <p className="price-highlight mb-1">
                    {formatMoney(price)}
                  </p>

                  <p className="mb-3">
                    <strong>Stock:</strong> {product.stock ?? 0}
                  </p>

                  <Link
                    to={`/productos/${product.id}`}
                    className="btn btn-outline-primary"
                    data-bs-dismiss="modal"
                  >
                    Ver ficha completa
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-muted mb-0">Sin información.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}