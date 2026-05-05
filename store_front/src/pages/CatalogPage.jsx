import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';

const PRODUCT_TYPES = [
  { value: 'single', label: 'Carta individual' },
  { value: 'sealed', label: 'Producto sellado' },
  { value: 'bundle', label: 'Bundle' },
];

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
];

const normalizeList = (data) => data?.results || data || [];

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
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [foil, setFoil] = useState('');
  const [loading, setLoading] = useState(false);

  const { addItem } = useCart();

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

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();

      const matchesSearch =
        !search || name.includes(search) || description.includes(search);

      const matchesType = !type || product.product_type === type;

      const matchesRarity =
        !rarity || getProductRarity(product).toLowerCase() === rarity;

      const matchesFoil =
        !foil || String(getProductIsFoil(product)) === foil;

      return matchesSearch && matchesType && matchesRarity && matchesFoil;
    });
  }, [products, query, type, rarity, foil]);

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
              {PRODUCT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
      ) : (
        <ProductSlider products={filtered} onAdd={addItem} />
      )}
    </>
  );
}