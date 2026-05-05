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
    card?.image_large ||
    card?.image_normal ||
    card?.image_small ||
    placeholderImage
  );
};

export default function ProductCarousel({ products = [] }) {
  const featured = products.filter((product) => product.image || getCard(product)).slice(0, 3);

  if (!featured.length) return null;

  return (
    <div
      id="featuredCarousel"
      className="carousel slide mb-4"
      data-bs-ride="carousel"
    >
      <div className="carousel-inner rounded-4">
        {featured.map((product, index) => {
          const card = getCard(product);
          const image = getImage(product, card);
          const price = product.computed_price_clp || product.price_clp;

          return (
            <div
              key={product.id}
              className={`carousel-item ${index === 0 ? 'active' : ''}`}
            >
              <div className="hero-banner p-4 p-md-5 text-white">
                <div className="row align-items-center g-4">
                  <div className="col-md-8">
                    <span className="badge badge-warning mb-3">
                      Destacado
                    </span>

                    <h2 className="mb-3">{product.name}</h2>

                    <p className="text-light mb-3">
                      {product.description
                        ? `${product.description.slice(0, 140)}${product.description.length > 140 ? '...' : ''
                        }`
                        : card?.type_line || 'Producto disponible en catálogo.'}
                    </p>

                    <p className="price-highlight mb-4">
                      {formatMoney(price)}
                    </p>

                    <Link
                      to={`/productos/${product.id}`}
                      className="btn btn-primary"
                    >
                      Ver detalle
                    </Link>
                  </div>

                  <div className="col-md-4 text-center">
                    <img
                      src={image}
                      alt={product.name}
                      className="img-fluid rounded-4 carousel-product-image"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {featured.length > 1 && (
        <>
          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#featuredCarousel"
            data-bs-slide="prev"
            aria-label="Producto anterior"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true" />
          </button>

          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#featuredCarousel"
            data-bs-slide="next"
            aria-label="Producto siguiente"
          >
            <span className="carousel-control-next-icon" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}