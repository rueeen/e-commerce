import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { useCart } from '../hooks/useCart';
import ProductCarousel from '../components/ProductCarousel';
import ProductSlider from '../components/ProductSlider';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
    api.products().then(({ data }) => setProducts(data.results || data));
  }, []);

  return (
    <>
      <section className="hero-banner rounded-4 p-5 mb-4 text-white">
        <h1>Tu tienda de físicos y singles digitales</h1>
        <p>Descubre lanzamientos, compra rápido y gestiona tus pedidos.</p>
      </section>
      <ProductCarousel products={products} />
      <h3 className="mb-3">Destacados</h3>
      <ProductSlider products={products.slice(0, 8)} onAdd={addItem} />
    </>
  );
}
