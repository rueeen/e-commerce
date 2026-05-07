import ProductCard from './ProductCard';

const getProductType = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type ||
  'other';

const getColumnClass = (product, variant) => {
  const type = variant || getProductType(product);

  if (['bundle', 'sealed', 'accessory'].includes(type)) {
    return 'col-12 col-md-6 col-xl-4';
  }

  return 'col-12 col-sm-6 col-lg-3';
};

export default function ProductSlider({
  products = [],
  onAdd,
  emptyMessage = 'No hay productos disponibles.',
  variant = '',
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
        <div key={product.id} className={getColumnClass(product, variant)}>
          <ProductCard product={product} onAdd={onAdd} />
        </div>
      ))}
    </div>
  );
}
