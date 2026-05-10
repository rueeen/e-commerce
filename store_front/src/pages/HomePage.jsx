import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/endpoints';
import { fetchAllPaginated } from '../api/pagination';
import ProductCarousel from '../components/ProductCarousel';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';
import { getProductTypeValue } from '../utils/product';

const PRODUCT_TYPE_ORDER = ['bundle', 'sealed', 'single', 'accessory', 'service', 'other'];

const PRODUCT_TYPE_LABELS = {
  bundle: 'Bundles',
  sealed: 'Productos sellados',
  single: 'Cartas individuales',
  accessory: 'Accesorios',
  service: 'Servicios / encargos',
  other: 'Otros productos',
};

const groupProductsByType = (items) => {
  return items.reduce((groups, product) => {
    const type = getProductTypeValue(product) || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(product);
    return groups;
  }, {});
};

const getOrderedProductTypes = (groups) => {
  const knownTypes = PRODUCT_TYPE_ORDER.filter((type) => groups[type]?.length);
  const extraTypes = Object.keys(groups).filter((type) => !PRODUCT_TYPE_ORDER.includes(type));
  return [...knownTypes, ...extraTypes];
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addItem } = useCart();

  const availableProducts = useMemo(() => {
    return products.filter((product) => {
      return Number(product?.stock || 0) > 0 || getProductTypeValue(product) === 'service';
    });
  }, [products]);

  const groupedProducts = useMemo(() => groupProductsByType(availableProducts), [availableProducts]);
  const orderedTypes = useMemo(() => getOrderedProductTypes(groupedProducts), [groupedProducts]);

  const carouselProducts = useMemo(() => {
    return products.filter((product) => product.image).slice(0, 6);
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);

    try {
      const data = await fetchAllPaginated(api.getProducts, {
        active: 'true',
        available: 'true',
      });

      setProducts(data);
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
              <h3 className="mb-1">Destacados por categoría</h3>
              <p className="text-muted mb-0">
                Priorizamos bundles y productos sellados para compra inmediata.
              </p>
            </div>

            <Link to="/catalogo" className="btn btn-outline-primary">
              Ver todos
            </Link>
          </div>

          {orderedTypes.length > 0 ? (
            <div className="catalog-sections">
              {orderedTypes.map((sectionType) => (
                <section key={sectionType} className="catalog-section">
                  <div className="catalog-section-header">
                    <div>
                      <h3 className="mb-1">{PRODUCT_TYPE_LABELS[sectionType] || sectionType}</h3>
                      <p className="text-muted mb-0">
                        {groupedProducts[sectionType].length} producto(s) disponibles
                      </p>
                    </div>

                    <Link to={`/catalogo?type=${sectionType}`} className="btn btn-outline-primary btn-sm">
                      Ver sección
                    </Link>
                  </div>

                  <ProductSlider
                    products={groupedProducts[sectionType].slice(
                      0,
                      sectionType === 'bundle' || sectionType === 'sealed' ? 6 : 8,
                    )}
                    onAdd={addItem}
                    variant={sectionType}
                  />
                </section>
              ))}
            </div>
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
