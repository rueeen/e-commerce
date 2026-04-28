import ProductCard from './ProductCard';

export default function ProductSlider({ products, onAdd }) {
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
