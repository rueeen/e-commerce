import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCart } from '../hooks/useCart';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [kardex, setKardex] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
    api.productById(id).then(({ data }) => setProduct(data));
    api.productKardex(id).then(({ data }) => setKardex(data || [])).catch(() => setKardex([]));
  }, [id]);

  if (!product) return <LoadingSpinner />;

  return (
    <div className="row g-4 align-items-start">
      <div className="col-lg-6"><img src={product.image || product.mtg_card?.image_normal || 'https://placehold.co/900x600?text=Producto'} className="img-fluid rounded-4 shadow-sm w-100" alt={product.name} /></div>
      <div className="col-lg-6">
        <div className="panel-card p-4">
          <h2>{product.name}</h2>
          <p className="mb-1"><strong>Set:</strong> {product.mtg_card?.set_name} ({product.mtg_card?.set_code})</p>
          <p className="mb-1"><strong>Rareza:</strong> {product.mtg_card?.rarity} | <strong>Condición:</strong> {product.condition}</p>
          <p className="mb-1"><strong>Tipo:</strong> {product.mtg_card?.type_line}</p>
          <p className="text-secondary">{product.mtg_card?.oracle_text || product.description}</p>
          <p className="price-highlight">CLP ${product.price_clp}</p>
          <p className="mb-3">Stock: {product.stock}</p>
          <div className="mb-3 col-6"><label className="form-label">Cantidad</label><input type="number" min="1" max={Math.max(1, Number(product.stock || 1))} className="form-control" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} /></div>
          <button className="btn btn-primary" onClick={() => addItem(product, quantity)} disabled={Number(product.stock || 0) <= 0}><i className="bi bi-cart-plus me-2" />Agregar al carrito</button>
        </div>
        {kardex.length > 0 && <div className="panel-card p-4 mt-3"><h5>Kardex</h5><p><strong>Stock actual:</strong> {product.stock}</p><ul className="mb-0">{kardex.slice(0, 8).map((m) => <li key={m.id}>{m.movement_type} · {m.quantity} · {new Date(m.created_at).toLocaleString('es-CL')} (Stock: {m.previous_stock} → {m.new_stock})</li>)}</ul></div>}
      </div>
    </div>
  );
}
