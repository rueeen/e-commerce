import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];

function getCardImage(card) {
  return (
    card?.image_uris?.large ||
    card?.image_uris?.normal ||
    card?.image_uris?.small ||
    card?.card_faces?.[0]?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.small ||
    ''
  );
}

const initialForm = {
  category_id: '',
  price_clp: '',
  stock: 1,
  condition: 'NM',
  language: 'EN',
  is_foil: false,
  is_active: true,
  notes: '',
};

export default function ScryfallSingleCreate() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await api.getCategories();
        setCategories(data?.results || data || []);
      } catch {
        notyf.error('No se pudieron cargar categorías');
      }
    };
    loadCategories();
  }, []);

  const selectedImage = useMemo(() => getCardImage(selected), [selected]);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.searchScryfallCards(q.trim());
      setResults(data?.data || data?.results || []);
    } catch {
      notyf.error('No se pudo buscar en Scryfall');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (card) => {
    setSelected(card);
    setForm(initialForm);
  };

  const submit = async () => {
    if (!selected) return;
    if (!form.category_id) {
      notyf.error('Debes seleccionar una categoría');
      return;
    }
    if (form.price_clp === '' || Number(form.price_clp) <= 0) {
      notyf.error('Debes ingresar un precio válido');
      return;
    }
    if (Number(form.stock) < 0) {
      notyf.error('El stock no puede ser menor a 0');
      return;
    }

    setSaving(true);
    try {
      await api.createSingleFromScryfall({ ...form, scryfall_id: selected.id });
      notyf.success('Single creado/actualizado correctamente');
      setSelected(null);
      setForm(initialForm);
    } catch (e) {
      const responseMessage = e?.response?.data?.detail || e?.response?.data?.message;
      notyf.error(responseMessage || 'Error al crear single');
    } finally {
      setSaving(false);
    }
  };

  return <div>
    <h3>Crear single desde Scryfall</h3>
    <div className="input-group mb-3"><input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: Cloud, Sauron..." /><button className="btn btn-primary" onClick={search} disabled={loading}><i className="bi bi-search" /> Buscar</button></div>
    <div className="row g-3">
      {results.map((c) => <div className="col-md-3" key={c.id}><div className="card h-100 bg-dark text-light"><img src={getCardImage(c)} className="card-img-top scryfall-card-img" alt={c.name} /><div className="card-body"><h6>{c.name}</h6><small>{c.set?.toUpperCase()} #{c.collector_number} · {c.rarity}</small><button className="btn btn-outline-light btn-sm mt-2 w-100" onClick={() => openCreateModal(c)}>Crear single</button></div></div></div>)}
    </div>

    {selected && <div className="modal d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div className="modal-content bg-dark text-light">
          <div className="modal-header">
            <h5 className="modal-title">Crear single: {selected.name}</h5>
            <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setSelected(null)} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-4">{selectedImage && <img src={selectedImage} className="img-fluid scryfall-card-img" alt={selected.name} />}</div>
              <div className="col-md-8">
                <div className="row g-2">
                  <div className="col-md-6"><label className="form-label">Categoría</label><select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Selecciona categoría</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                  <div className="col-md-6"><label className="form-label">Precio CLP</label><input type="number" min="1" className="form-control" placeholder="Precio CLP" value={form.price_clp} onChange={(e) => setForm({ ...form, price_clp: Number(e.target.value) })} /></div>
                  <div className="col-md-6"><label className="form-label">Stock</label><input type="number" min="0" className="form-control" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                  <div className="col-md-6"><label className="form-label">Condición</label><select className="form-select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{conditions.map((it) => <option key={it}>{it}</option>)}</select></div>
                  <div className="col-md-6"><label className="form-label">Idioma</label><input className="form-control" placeholder="Idioma" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
                  <div className="col-md-6 d-flex gap-3 align-items-center"><div className="form-check"><input className="form-check-input" type="checkbox" checked={form.is_foil} onChange={(e) => setForm({ ...form, is_foil: e.target.checked })} /><label className="form-check-label">Foil</label></div><div className="form-check"><input className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><label className="form-check-label">Activo</label></div></div>
                  <div className="col-12"><label className="form-label">Notas</label><textarea className="form-control" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancelar</button>
            <button type="button" className="btn btn-success" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar single'}</button>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
