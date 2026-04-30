import { useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];

export default function ScryfallSingleCreate() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category_id: '', price_clp: 0, stock: 1, condition: 'NM', language: 'EN', is_foil: false, is_active: true, notes: '' });

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.searchScryfallCards(q.trim());
      setResults(data.results || []);
    } catch {
      notyf.error('No se pudo buscar en Scryfall');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!selected) return;
    try {
      await api.createSingleFromScryfall({ ...form, scryfall_id: selected.id });
      notyf.success('Single creado/actualizado correctamente');
    } catch (e) {
      notyf.error(e?.response?.data?.detail || 'Error al crear single');
    }
  };

  return <div>
    <h3>Crear single desde Scryfall</h3>
    <div className="input-group mb-3"><input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: Cloud, Sauron..." /><button className="btn btn-primary" onClick={search} disabled={loading}><i className="bi bi-search" /> Buscar</button></div>
    <div className="row g-3">
      {results.map((c) => <div className="col-md-3" key={c.id}><div className="card h-100 bg-dark text-light"><img src={c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small} className="card-img-top" alt={c.name} /><div className="card-body"><h6>{c.name}</h6><small>{c.set?.toUpperCase()} #{c.collector_number} · {c.rarity}</small><button className="btn btn-outline-light btn-sm mt-2 w-100" onClick={() => setSelected(c)}>Crear single</button></div></div></div>)}
    </div>
    {selected && <div className="panel-card p-3 mt-4">
      <h5>{selected.name}</h5>
      <div className="row g-2">
        <div className="col-md-2"><input className="form-control" placeholder="Category ID" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} /></div>
        <div className="col-md-2"><input type="number" className="form-control" placeholder="Precio CLP" value={form.price_clp} onChange={(e) => setForm({ ...form, price_clp: Number(e.target.value) })} /></div>
        <div className="col-md-2"><input type="number" className="form-control" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
        <div className="col-md-2"><select className="form-select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{conditions.map((it) => <option key={it}>{it}</option>)}</select></div>
        <div className="col-md-2"><input className="form-control" placeholder="Idioma" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
        <div className="col-md-2 form-check d-flex align-items-center"><input className="form-check-input me-2" type="checkbox" checked={form.is_foil} onChange={(e) => setForm({ ...form, is_foil: e.target.checked })} /><label className="form-check-label">Foil</label></div>
        <div className="col-12"><textarea className="form-control" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <button className="btn btn-success mt-3" onClick={submit}><i className="bi bi-plus-circle" /> Guardar single</button>
    </div>}
  </div>;
}
