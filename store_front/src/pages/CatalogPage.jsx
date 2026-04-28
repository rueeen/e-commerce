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
  const { addItem } = useCart();

  useEffect(() => {
    api.products().then(({ data }) => setProducts(data.results || data));
    api.categories().then(({ data }) => setCategories(data.results || data));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchName = p.name.toLowerCase().includes(query.toLowerCase());
        const matchCategory = !category || String(p.category) === category;
        const matchType = !type || p.product_type === type;
        return matchName && matchCategory && matchType;
      }),
    [products, query, category, type]
  );

  return (
    <>
      <h2 className="mb-3">Catálogo</h2>
      <div className="row g-2 mb-4">
        <div className="col-md-4"><input className="form-control" placeholder="Buscar por nombre" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="col-md-4">
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="physical">Físico</option>
            <option value="digital">Digital</option>
          </select>
        </div>
      </div>
      <ProductSlider products={filtered} onAdd={addItem} />
    </>
  );
}
