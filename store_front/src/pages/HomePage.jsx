import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/endpoints';
import ProductCarousel from '../components/ProductCarousel';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';

const normalizeList = (data) => data?.results || data || [];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addItem } = useCart();

  const featuredProducts = useMemo(() => {
    return products
      .filter((product) => product.stock > 0)
      .slice(0, 8);
  }, [products]);

  const carouselProducts = useMemo(() => {
    return products
      .filter((product) => product.image)
      .slice(0, 6);
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);

    try {
      const { data } = await api.getProducts({
        active: 'true',
      });

      setProducts(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <>
      <section className="hero-banner rounded-4 p-5 mb-4 text-white">
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <span className="badge badge-warning mb-3">
              Magic: The Gathering Store
            </span>

            <h1 className="display-5 fw-bold mb-3">
              Singles, sellados y bundles para tu próxima partida
            </h1>

            <p className="lead mb-4">
              Encuentra cartas individuales, productos sellados y compras especiales
              con inventario controlado, precios en CLP y seguimiento de pedidos.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <Link to="/catalogo" className="btn btn-primary">
                Ver catálogo
              </Link>

              <Link to="/mis-pedidos" className="btn btn-outline-light">
                Mis pedidos
              </Link>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="panel-card p-3">
              <h5 className="mb-2">Compra simple y segura</h5>
              <p className="text-muted mb-0">
                Agrega productos al carrito, genera tu orden y espera confirmación
                del equipo para completar el flujo de venta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">
          Cargando productos destacados...
        </div>
      ) : products.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">
          Aún no hay productos activos en el catálogo.
        </div>
      ) : (
        <>
          {carouselProducts.length > 0 && (
            <div className="mb-4">
              <ProductCarousel products={carouselProducts} />
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h3 className="mb-1">Destacados</h3>
              <p className="text-muted mb-0">
                Productos disponibles para comprar ahora.
              </p>
            </div>

            <Link to="/catalogo" className="btn btn-outline-primary">
              Ver todos
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <ProductSlider products={featuredProducts} onAdd={addItem} />
          ) : (
            <div className="panel-card p-4 text-center text-muted">
              No hay productos con stock disponible por ahora.
            </div>
          )}
        </>
      )}
    </>
  );
}