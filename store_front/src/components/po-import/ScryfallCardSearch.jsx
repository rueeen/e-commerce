import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/endpoints';

function getCardImage(card) {
  return (
    card?.image_small ||
    card?.image_normal ||
    card?.image_large ||
    card?.image_uris?.small ||
    card?.image_uris?.normal ||
    card?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.small ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.large ||
    ''
  );
}

function getCardId(card) {
  return card?.id || card?.scryfall_id || `${card?.name}-${card?.set_code}-${card?.collector_number}`;
}

function getSetCode(card) {
  return card?.set_code || card?.set || '';
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function ScryfallCardSearch({
  onSelect,
  placeholder = 'Buscar carta...',
  defaultValue = '',
}) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(defaultValue || '');
  }, [defaultValue]);

  useEffect(() => {
    const searchText = query.trim();

    if (!searchText) {
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError('');

      try {
        const { data } = await api.searchScryfallCards(searchText);
        setResults(normalizeList(data));
        setOpen(true);
      } catch {
        setResults([]);
        setError('No se pudo buscar en Scryfall.');
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current) return;

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const normalized = useMemo(() => results.slice(0, 8), [results]);

  const handleSelect = (card) => {
    onSelect?.(card);
    setQuery(card.name || '');
    setOpen(false);
  };

  return (
    <div className="po-search" ref={containerRef}>
      <label className="po-label">Buscar en Scryfall</label>

      <input
        className="po-input"
        value={query}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (normalized.length > 0) {
            setOpen(true);
          }
        }}
      />

      {error ? (
        <p className="po-error" aria-live="polite">
          {error}
        </p>
      ) : null}

      {open && (isLoading || normalized.length > 0) ? (
        <div className="po-search-dropdown">
          {isLoading ? (
            <div className="po-search-item">Buscando...</div>
          ) : (
            normalized.map((card) => {
              const image = getCardImage(card);
              const setCode = getSetCode(card);

              return (
                <button
                  key={getCardId(card)}
                  type="button"
                  className="po-search-item"
                  onClick={() => handleSelect(card)}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={card.name}
                      className="po-thumb"
                    />
                  ) : (
                    <div className="po-thumb" />
                  )}

                  <span>
                    {card.name} · {setCode.toUpperCase() || 'SET'} ·{' '}
                    {card.rarity || 'sin rareza'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}