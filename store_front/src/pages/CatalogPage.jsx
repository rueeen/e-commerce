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

const PRODUCT_TYPE_ORDER = ['bundle', 'sealed', 'single', 'accessory', 'service', 'other'];
const PRODUCT_TYPE_LABELS = {
  bundle: 'Bundles',
  sealed: 'Productos sellados',
  single: 'Cartas individuales',
  accessory: 'Accesorios',
  service: 'Servicios / encargos',
  other: 'Otros productos',
};

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
];

const getProductTypeValue = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type_data?.slug ||
  product?.product_type_detail?.slug ||
  product?.product_type ||
  'other';

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

      setProductTypes(typeResults.length > 0 ? typeResults : FALLBACK_PRODUCT_TYPES);
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
      const productType = getProductTypeValue(product);
      const isSingle = productType === 'single';

      const matchesSearch = !search || name.includes(search) || description.includes(search);
      const matchesType = !type || productType === type;
      const hasStock = Number(product.stock || 0) > 0 || productType === 'service';

      const appliesSingleFilters =
        type === 'single' ||
        (!type && isSingle && (rarity !== '' || foil !== ''));

      const matchesRarity =
        !appliesSingleFilters || !rarity || getProductRarity(product).toLowerCase() === rarity;
      const matchesFoil =
        !appliesSingleFilters || !foil || String(getProductIsFoil(product)) === foil;

      return matchesSearch && matchesType && matchesRarity && matchesFoil && hasStock;
    });
  }, [products, query, type, rarity, foil]);

  const groupedProducts = useMemo(() => groupProductsByType(filtered), [filtered]);

  const orderedTypes = useMemo(() => {
    if (type) return groupedProducts[type]?.length ? [type] : [];
    return getOrderedProductTypes(groupedProducts);
  }, [groupedProducts, type]);

  const clearFilters = () => {
    setQuery('');
    setType('');
    setRarity('');
    setFoil('');
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
            <input className="form-control" placeholder="Buscar carta o producto" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="col-md-2">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Todos</option>
              {productTypes.map((option) => (
                <option key={option.id || option.slug || option.value || option.code} value={option.slug || option.value || option.code}>
                  {option.name || option.label}
                </option>
              ))}
            </select>
          </div>

          {showSingleOnlyFilters && (
            <>
              <div className="col-md-2">
                <label className="form-label">Rareza</label>
                <select className="form-select" value={rarity} onChange={(event) => setRarity(event.target.value)}>
                  <option value="">Todas</option>
                  {RARITIES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Foil</label>
                <select className="form-select" value={foil} onChange={(event) => setFoil(event.target.value)}>
                  <option value="">Todos</option>
                  <option value="true">Foil</option>
                  <option value="false">Non-foil</option>
                </select>
              </div>
            </>
          )}

          <div className="col-md-2">
            <label className="form-label d-none d-md-block">&nbsp;</label>
            <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>Limpiar</button>
          </div>
        </div>

        <div className="small text-muted mt-3">
          {loading ? 'Cargando productos...' : `${filtered.length} producto(s) encontrados.`}
        </div>
      </div>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">Cargando catálogo...</div>
      ) : filtered.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">No hay productos disponibles para los filtros seleccionados.</div>
      ) : (
        <div className="catalog-sections">
          {orderedTypes.map((sectionType) => (
            <section key={sectionType} className="catalog-section">
              <div className="catalog-section-header">
                <div>
                  <h2 className="h4 mb-1">{PRODUCT_TYPE_LABELS[sectionType] || sectionType}</h2>
                  <p className="text-muted mb-0">{groupedProducts[sectionType].length} producto(s)</p>
                </div>
              </div>

              <ProductSlider products={groupedProducts[sectionType]} onAdd={addItem} variant={sectionType} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
