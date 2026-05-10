import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from '../api/endpoints';
import LoadingSpinner from '../components/LoadingSpinner';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatDate, formatMoney } from '../utils/format';

const placeholderImage = 'https://placehold.co/900x600?text=Producto';

const getCard = (product) => {
  return product?.single_card?.mtg_card || product?.mtg_card || null;
};

const getCondition = (product) => {
  return product?.single_card?.condition || product?.condition || '-';
};

const getLanguage = (product) => {
  return product?.single_card?.language || product?.language || '-';
};

const getIsFoil = (product) => {
  if (product?.single_card && typeof product.single_card.is_foil === 'boolean') {
    return product.single_card.is_foil;
  }

  return Boolean(product?.is_foil);
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

export default function ProductDetailPage() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [kardex, setKardex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const { addItem } = useCart();
  const { isAdmin, isWorker } = useAuth();

  const card = useMemo(() => getCard(product), [product]);

  const stock = Number(product?.stock || 0);
  const isFoil = getIsFoil(product);
  const canBuy = stock > 0 && product?.is_active !== false;

  useEffect(() => {
    let alive = true;

    const loadProduct = async () => {
      setLoading(true);

      try {
        const { data } = await api.productById(id);

        if (!alive) return;

        setProduct(data);

        try {
          const kardexResponse = await api.productKardex(id);

          if (alive) {
            setKardex(kardexResponse.data || []);
          }
        } catch {
          if (alive) {
            setKardex([]);
          }
        }
      } catch {
        if (alive) {
          setProduct(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      alive = false;
    };
  }, [id]);

  const handleQuantityChange = (value) => {
    const nextQuantity = Math.max(1, Number(value || 1));
    const maxQuantity = Math.max(1, stock);

    setQuantity(Math.min(nextQuantity, maxQuantity));
  };

  const handleAddToCart = async () => {
    if (!canBuy) return;

    setAdding(true);

    try {
      await addItem(product, quantity);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return (
      <div className="panel-card p-4 text-center text-muted">
        No se pudo cargar el producto.
      </div>
    );
  }

  return (
    <div className="row g-4 align-items-start">
      <div className="col-lg-6">
        <div className="panel-card p-3">
          <img
            src={getImage(product, card)}
            className="img-fluid rounded-4 w-100"
            alt={product.name}
          />
        </div>
      </div>

      <div className="col-lg-6">
        <div className="panel-card p-4">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="badge badge-soft">{product.product_type}</span>

            {isFoil && <span className="badge badge-warning">Foil</span>}

            {stock > 0 ? (
              <span className="badge badge-success">Disponible</span>
            ) : (
              <span className="badge badge-error">Sin stock</span>
            )}
          </div>

          <h2>{product.name}</h2>

          {card && (
            <>
              <p className="mb-1">
                <strong>Set:</strong> {card.set_name || '-'}{' '}
                {card.set_code ? `(${String(card.set_code).toUpperCase()})` : ''}
              </p>

              <p className="mb-1">
                <strong>Rareza:</strong> {card.rarity || '-'} |{' '}
                <strong>Condición:</strong> {getCondition(product)} |{' '}
                <strong>Idioma:</strong> {getLanguage(product)}
              </p>

              <p className="mb-1">
                <strong>Tipo:</strong> {card.type_line || '-'}
              </p>
            </>
          )}

          <p className="text-secondary mt-3">
            {card?.oracle_text || product.description || 'Sin descripción.'}
          </p>

          <p className="price-highlight mb-2">
            {formatMoney(product.computed_price_clp || product.price_clp)}
          </p>

          <p className="mb-3">
            <strong>Stock:</strong> {stock}
          </p>

          <div className="mb-3 col-6">
            <label className="form-label">Cantidad</label>
            <input
              type="number"
              min="1"
              max={Math.max(1, stock)}
              className="form-control"
              value={quantity}
              onChange={(event) => handleQuantityChange(event.target.value)}
              disabled={!canBuy || adding}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={!canBuy || adding}
          >
            <i className="bi bi-cart-plus me-2" />
            {adding ? 'Agregando...' : 'Agregar al carrito'}
          </button>
        </div>

        {(isAdmin || isWorker) && kardex.length > 0 && (
          <div className="panel-card p-4 mt-3">
            <h5>Kardex</h5>
            <p>
              <strong>Stock actual:</strong> {stock}
            </p>

            <ul className="mb-0">
              {kardex.slice(0, 8).map((movement) => (
                <li key={movement.id}>
                  {movement.movement_type} · {movement.quantity} ·{' '}
                  {formatDate(movement.created_at)} · Stock:{' '}
                  {movement.previous_stock} → {movement.new_stock}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
