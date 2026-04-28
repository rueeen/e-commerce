import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCart } from '../hooks/useCart';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    api.productById(id).then(({ data }) => setProduct(data));
  }, [id]);

  if (!product) return <LoadingSpinner />;

  return (
    <div className="row g-4 align-items-start">
      <div className="col-md-6"><img src={product.image || 'https://placehold.co/700x450'} className="img-fluid rounded-4" alt={product.name} /></div>
      <div className="col-md-6">
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <p className="fw-bold fs-4">${product.price}</p>
        <button className="btn btn-primary" onClick={() => addItem(product)}>
          <i className="bi bi-cart-plus me-1" /> Agregar al carrito
        </button>
      </div>
    </div>
  );
}
