import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import ProductSlider from '../components/ProductSlider';
import { useCart } from '../hooks/useCart';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    api.products().then(({ data }) => setProducts(data.results || data));
    api.categories().then(({ data }) => setCategories(data.results || data));
  }, []);

  const filtered = useMemo(() => {
    const base = products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(query.toLowerCase());
      const matchCategory = !category || String(p.category?.id || p.category) === category;
      const matchType = !type || p.product_type === type;
      const matchFeatured = !onlyFeatured || p.featured;
      return matchName && matchCategory && matchType && matchFeatured;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
  }, [products, query, category, type, sortBy, onlyFeatured]);

  return (
    <>
      <h2 className="mb-3">Catálogo</h2>
      <div className="row g-2 mb-4">
        <div className="col-md-3"><input className="form-control" placeholder="Buscar por nombre" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="col-md-3"><select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas las categorías</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-md-2"><select className="form-select" value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos los tipos</option><option value="physical">Físico</option><option value="digital">Digital</option></select></div>
        <div className="col-md-2"><select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name_asc">Nombre A-Z</option><option value="name_desc">Nombre Z-A</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option></select></div>
        <div className="col-md-2 d-flex align-items-center"><div className="form-check"><input id="onlyFeatured" type="checkbox" className="form-check-input" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} /><label htmlFor="onlyFeatured" className="form-check-label">Destacados</label></div></div>
      </div>
      <ProductSlider products={filtered} onAdd={addItem} />
    </>
  );
}
