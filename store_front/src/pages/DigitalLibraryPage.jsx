import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { formatDateShort } from '../utils/format';

const normalizeList = (data) => data?.results || data || [];

export default function DigitalLibraryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLibrary = async () => {
    setLoading(true);

    try {
      const { data } = await api.digitalLibrary();
      setItems(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Mis singles digitales</h2>
          <p className="text-muted mb-0">
            Revisa las cartas digitales asociadas a tus compras.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={loadLibrary}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">
          Cargando biblioteca...
        </div>
      ) : items.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">
          Aún no tienes singles digitales registrados.
        </div>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div key={item.id} className="col-md-4 col-lg-3">
              <div className="card h-100">
                {item.image && (
                  <div className="product-card-image-wrapper">
                    <img
                      src={item.image}
                      alt={item.product_name}
                      className="product-card-image"
                    />
                  </div>
                )}

                <div className="card-body">
                  <h5 className="mb-2">{item.product_name}</h5>

                  <p className="text-muted mb-2">
                    Comprado el {formatDateShort(item.purchased_at)}
                  </p>

                  {item.order_id && (
                    <span className="badge badge-soft">
                      Orden #{item.order_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
