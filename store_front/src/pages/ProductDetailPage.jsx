import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCart } from '../hooks/useCart';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    api.productById(id).then(({ data }) => setProduct(data));
  }, [id]);

  if (!product) return <LoadingSpinner />;
  const isDigital = product.product_type === 'digital';

  return (
    <div className="row g-4 align-items-start">
      <div className="col-md-6"><img src={product.image || 'https://placehold.co/900x600?text=Producto'} className="img-fluid rounded-4 shadow-sm" alt={product.name} /></div>
      <div className="col-md-6">
        <h2>{product.name}</h2>
        <div className="d-flex gap-2 mb-2"><span className="badge text-bg-light border">{product.category?.name || 'Sin categoría'}</span><span className={`badge ${isDigital ? 'text-bg-dark' : 'text-bg-info'}`}>{isDigital ? 'Digital' : 'Físico'}</span></div>
        <p>{product.description}</p>
        <p className="fw-bold fs-4">${product.price}</p>
        <p className="mb-3">Stock: {isDigital ? 'No aplica' : product.stock}</p>
        {!isDigital ? <div className="mb-3" style={{ maxWidth: 180 }}><label className="form-label">Cantidad</label><input type="number" min="1" max={Math.max(1, Number(product.stock || 1))} className="form-control" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} /></div> : <p className="small text-muted">Single digital: cantidad fija en 1</p>}
        <button className="btn btn-primary" onClick={() => addItem(product, isDigital ? 1 : quantity)} disabled={!isDigital && Number(product.stock || 0) <= 0}>
          <i className="bi bi-cart-plus me-1" /> Agregar al carrito
        </button>
      </div>
    </div>
  );
}
