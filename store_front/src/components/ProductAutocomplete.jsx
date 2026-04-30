import { useMemo, useState } from 'react';

export default function ProductAutocomplete({ products, placeholder = 'Buscar producto...', onSelect, selectedLabel }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => (`${p.name} ${p.edition || ''} ${p.id}`).toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query]);

  return <div className="position-relative">
    <input className="form-control" placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} />
    {selectedLabel ? <small className="text-muted d-block mt-1">Seleccionado: {selectedLabel}</small> : null}
    {filtered.length > 0 ? <div className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 260, overflowY: 'auto' }}>
      {filtered.map((p) => <button type="button" key={p.id} className="list-group-item list-group-item-action" onClick={() => { onSelect(p); setQuery(''); }}>
        <div className="fw-semibold">{p.name}</div>
        <small className="text-muted">Set: {p.edition || '-'} · ID: {p.id}</small>
      </button>)}
    </div> : null}
  </div>;
}
