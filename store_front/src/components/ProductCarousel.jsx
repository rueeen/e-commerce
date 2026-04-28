export default function ProductCarousel({ products = [] }) {
  if (!products.length) return null;

  return (
    <div id="featuredCarousel" className="carousel slide mb-4" data-bs-ride="carousel">
      <div className="carousel-inner rounded-4">
        {products.slice(0, 3).map((product, idx) => (
          <div key={product.id} className={`carousel-item ${idx === 0 ? 'active' : ''}`}>
            <div className="hero-banner p-5 text-white">
              <h2>{product.name}</h2>
              <p>{product.description?.slice(0, 120)}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="carousel-control-prev" type="button" data-bs-target="#featuredCarousel" data-bs-slide="prev">
        <span className="carousel-control-prev-icon" aria-hidden="true" />
      </button>
      <button className="carousel-control-next" type="button" data-bs-target="#featuredCarousel" data-bs-slide="next">
        <span className="carousel-control-next-icon" aria-hidden="true" />
      </button>
    </div>
  );
}
