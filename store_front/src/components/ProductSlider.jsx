import ProductCard from './ProductCard';

export default function ProductSlider({
  products = [],
  onAdd,
  emptyMessage = 'No hay productos disponibles.',
}) {
  if (!products.length) {
    return (
      <div className="panel-card p-4 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="row g-3">
      {products.map((product) => (
        <div key={product.id} className="col-12 col-sm-6 col-lg-3">
          <ProductCard product={product} onAdd={onAdd} />
        </div>
      ))}
    </div>
  );
}