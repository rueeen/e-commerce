import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { fetchAllPaginated } from '../api/pagination';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';

const FALLBACK_PRODUCT_TYPES = [
  { value: 'single', label: 'Carta individual' },
  { value: 'sealed', label: 'Producto sellado' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'accessory', label: 'Accesorio' },
  { value: 'service', label: 'Servicio / encargo' },
  { value: 'other', label: 'Otro' },
];

const CATALOG_TYPE_ORDER = ['single', 'sealed', 'bundle', 'accessory', 'service', 'other'];

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
];

const getProductType = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type ||
  'other';

const getProductTypeLabel = (type) => {
  const labels = {
    single: 'Cartas individuales',
    sealed: 'Productos sellados',
    bundle: 'Bundles',
    accessory: 'Accesorios',
    service: 'Servicios / encargos',
    other: 'Otros',
  };

  return labels[type] || type;
};

const getProductRarity = (product) => {
  return product.single_card?.mtg_card?.rarity || product.mtg_card?.rarity || '';
};

const getProductIsFoil = (product) => {
  if (product.single_card && typeof product.single_card.is_foil === 'boolean') {
    return product.single_card.is_foil;
  }

  return Boolean(product.is_foil);
};

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState(FALLBACK_PRODUCT_TYPES);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [foil, setFoil] = useState('');
  const [loading, setLoading] = useState(false);

  const { addItem } = useCart();

  const loadCatalogData = async () => {
    setLoading(true);

    try {
      const [productsData, typesResponse] = await Promise.all([
        fetchAllPaginated(api.getProducts, { active: 'true', available: 'true' }),
        api.getProductTypes({ is_active: true }),
      ]);

      setProducts(productsData);

      const typeResults = Array.isArray(typesResponse?.data?.results)
        ? typesResponse.data.results
        : Array.isArray(typesResponse?.data)
          ? typesResponse.data
          : [];

      if (typeResults.length > 0) {
        setProductTypes(typeResults);
      } else {
        setProductTypes(FALLBACK_PRODUCT_TYPES);
      }
    } catch {
      setProductTypes(FALLBACK_PRODUCT_TYPES);
      try {
        const data = await fetchAllPaginated(api.getProducts, { active: 'true', available: 'true' });
        setProducts(data);
      } catch {
        // El apiClient ya muestra el error.
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  const showSingleOnlyFilters = type === '' || type === 'single';

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      const productType = getProductType(product);
      const isSingle = productType === 'single';

      const matchesSearch = !search || name.includes(search) || description.includes(search);
      const matchesType = !type || productType === type;

      const matchesRarity = !rarity || !isSingle || getProductRarity(product).toLowerCase() === rarity;
      const matchesFoil = !foil || !isSingle || String(getProductIsFoil(product)) === foil;

      const hasStock = Number(product.stock || 0) > 0;

      return matchesSearch && matchesType && matchesRarity && matchesFoil && hasStock;
    });
  }, [products, query, type, rarity, foil]);

  const groupedProducts = useMemo(() => {
    return filtered.reduce((groups, product) => {
      const productType = getProductType(product);
      const groupType = productType || 'other';

      if (!groups[groupType]) {
        groups[groupType] = [];
      }

      groups[groupType].push(product);
      return groups;
    }, {});
  }, [filtered]);

  const clearFilters = () => {
    setQuery('');
    setType('');
    setRarity('');
    setFoil('');
  };

  const renderCatalogSection = (sectionType) => {
    const sectionProducts = groupedProducts[sectionType] || [];

    if (!sectionProducts.length) {
      return null;
    }

    return (
      <section className="catalog-section" key={sectionType}>
        <div className="catalog-section-header d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 mb-0">{getProductTypeLabel(sectionType)}</h2>
          <span className="text-muted small">{sectionProducts.length} producto(s)</span>
        </div>

        <ProductSlider products={sectionProducts} onAdd={addItem} variant={sectionType} />
      </section>
    );
  };

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-2">Catálogo Magic: The Gathering</h2>
        <p className="text-secondary mb-0">
          Explora cartas, productos sellados y bundles con estética premium para
          duelistas y coleccionistas.
        </p>
      </div>

      <div className="panel-card p-3 mb-4">
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Buscar</label>
            <input
              className="form-control"
              placeholder="Buscar carta o producto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Todos</option>
              {productTypes.map((option) => (
                <option
                  key={option.id || option.slug || option.value || option.code}
                  value={option.slug || option.value || option.code}
                >
                  {option.name || option.label}
                </option>
              ))}
            </select>
          </div>

          {showSingleOnlyFilters && (
            <>
              <div className="col-md-2">
                <label className="form-label">Rareza</label>
                <select
                  className="form-select"
                  value={rarity}
                  onChange={(event) => setRarity(event.target.value)}
                >
                  <option value="">Todas</option>
                  {RARITIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Foil</label>
                <select
                  className="form-select"
                  value={foil}
                  onChange={(event) => setFoil(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Foil</option>
                  <option value="false">Non-foil</option>
                </select>
              </div>
            </>
          )}

          <div className="col-md-2">
            <label className="form-label d-none d-md-block">&nbsp;</label>
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={clearFilters}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="small text-muted mt-3">
          {loading
            ? 'Cargando productos...'
            : `${filtered.length} producto(s) encontrados.`}
        </div>
      </div>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">
          Cargando catálogo...
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">
          No hay productos disponibles para los filtros seleccionados.
        </div>
      ) : type ? (
        <ProductSlider products={groupedProducts[type] || []} onAdd={addItem} variant={type} />
      ) : (
        <div className="d-flex flex-column gap-4">
          {CATALOG_TYPE_ORDER.map((sectionType) => renderCatalogSection(sectionType))}
          {Object.keys(groupedProducts)
            .filter((sectionType) => !CATALOG_TYPE_ORDER.includes(sectionType))
            .map((sectionType) => renderCatalogSection(sectionType))}
        </div>
      )}
    </>
  );
}
