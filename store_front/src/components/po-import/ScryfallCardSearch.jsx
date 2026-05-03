import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../api/fetchClient';

export default function ScryfallCardSearch({ onSelect, placeholder = 'Buscar carta...', defaultValue = '' }) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef();

  useEffect(() => {
    if (!query?.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await apiClient(`/api/products/scryfall/search/?q=${encodeURIComponent(query)}`);
        setResults(data?.results || data || []);
        setOpen(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  const normalized = useMemo(() => results.slice(0, 8), [results]);

  return <div className="po-search">
    <label className="po-label">Buscar en Scryfall</label>
    <input className="po-input" value={query} placeholder={placeholder} onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)} />
    {error ? <p className="po-error" aria-live="polite">{error}</p> : null}
    {open && (isLoading || normalized.length > 0) ? <div className="po-search-dropdown">
      {isLoading ? <div className="po-search-item">Buscando...</div> : normalized.map((card) => (
        <button key={card.id} type="button" className="po-search-item" onClick={() => { onSelect?.(card); setQuery(card.name); setOpen(false); }}>
          {card.image_small ? <img src={card.image_small} alt={card.name} className="po-thumb" /> : <div className="po-thumb" />}
          <span>{card.name} · {card.set_code?.toUpperCase()} · {card.rarity}</span>
        </button>
      ))}
    </div> : null}
  </div>;
}
