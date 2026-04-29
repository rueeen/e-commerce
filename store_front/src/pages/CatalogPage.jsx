import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [foil, setFoil] = useState('');
  const { addItem } = useCart();

  useEffect(() => {
    api.getProducts({ active: true }).then(({ data }) => setProducts(data.results || data));
  }, []);

  const filtered = useMemo(() => products.filter((p) => {
    const byName = p.name.toLowerCase().includes(query.toLowerCase());
    const byType = !type || p.product_type === type;
    const byRarity = !rarity || p.mtg_card?.rarity === rarity;
    const byFoil = !foil || String(p.is_foil) === foil;
    return byName && byType && byRarity && byFoil;
  }), [products, query, type, rarity, foil]);

  return <>
    <h2 className="mb-3">Catálogo Magic: The Gathering</h2>
    <p className="text-secondary mb-4">Explora cartas, sellados y accesorios con estética premium para duelistas y coleccionistas.</p>
    <div className="row g-2 mb-4 panel-card p-3">
      <div className="col-md-4"><input className="form-control" placeholder="Buscar carta/producto" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="col-md-3"><select className="form-select" value={type} onChange={(e) => setType(e.target.value)}><option value="">Tipo de producto</option><option value="single">Carta individual</option><option value="sealed">Sellado</option><option value="accessory">Accesorio</option><option value="deck">Mazo</option><option value="bundle">Bundle</option></select></div>
      <div className="col-md-3"><input className="form-control" placeholder="Rareza (common, rare...)" value={rarity} onChange={(e) => setRarity(e.target.value)} /></div>
      <div className="col-md-2"><select className="form-select" value={foil} onChange={(e) => setFoil(e.target.value)}><option value="">Foil</option><option value="true">Foil</option><option value="false">Non-foil</option></select></div>
    </div>
    <ProductSlider products={filtered} onAdd={addItem} />
  </>;
}
