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
  const [pricingPreview, setPricingPreview] = useState(null);
  const [missingSingleCategory, setMissingSingleCategory] = useState(false);

  const normalizeCategories = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const findSingleCategory = (list) => list.find((cat) => cat?.name?.trim()?.toLowerCase() === 'cartas individuales');

  const loadCategories = async () => {
    const { data } = await api.getCategories();
    const loaded = normalizeCategories(data);
    setCategories(loaded);
    const singleCategory = findSingleCategory(loaded);
    setMissingSingleCategory(!singleCategory);
    if (singleCategory) {
      setForm((prev) => ({ ...prev, category_id: Number(singleCategory.id) }));
    }
  };

  useEffect(() => {
    loadCategories()
      .catch(() => notyf.error('No se pudieron cargar categorías'));
  }, []);

  const createSingleCategory = async () => {
    setSaving(true);
    api.getCategories()
      .then(() => api.createCategory({ name: 'Cartas individuales' }))
      .then(() => loadCategories())
      .then(() => notyf.success('Categoría Cartas individuales creada correctamente'))
      .catch((e) => notyf.error(e?.response?.data?.detail || 'No se pudo crear la categoría'))
      .finally(() => setSaving(false));
  };

  const selectedImage = useMemo(() => getCardImage(selected), [selected]);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.searchScryfallCards(q.trim());
      setResults(data?.data || data?.results || []);
    } catch { notyf.error('No se pudo buscar en Scryfall'); } finally { setLoading(false); }
  };

  const openCreateModal = (card) => {
    const usd = Number(card?.prices?.usd || 0);
    const suggested = Math.round((usd * 1000 * 1.3 * 1.1 * 1.25) / 100) * 100;
    setPricingPreview({ usd, suggested });
    setSelected(card);
    setForm((prev) => ({ ...initialForm, category_id: prev.category_id, price_clp: suggested || 0 }));
  };

  const submit = async () => {
    if (!selected) return;
    if (!form.category_id) return notyf.error('Debes seleccionar una categoría');
    if (form.price_clp === '') return notyf.error('Debes ingresar un precio final válido');
    setSaving(true);
    try {
      console.log('Creando single con Scryfall ID:', selected.id);
      await api.createSingleFromScryfall({ ...form, scryfall_id: selected.id, category_id: Number(form.category_id), price_clp: Number(form.price_clp) });
      notyf.success('Single creado/actualizado correctamente');
      setSelected(null);
      setForm(initialForm);
      setPricingPreview(null);
    } catch (e) {
      notyf.error(e?.response?.data?.detail || e?.response?.data?.message || 'Error al crear single');
    } finally { setSaving(false); }
  };

  return <div><h3>Crear single desde Scryfall</h3>
    <div className="alert alert-info">El stock se ingresa mediante Orden de Compra.</div><div className="input-group mb-3"><input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: Cloud, Sauron..." /><button className="btn btn-primary" onClick={search} disabled={loading}><i className="bi bi-search" /> Buscar</button></div>
    <div className="row g-3">{results.map((c) => <div className="col-md-3" key={c.id}><div className="card h-100 bg-dark text-light"><img src={getCardImage(c)} className="card-img-top scryfall-card-img" alt={c.name} /><div className="card-body"><h6>{c.name}</h6><small>{c.set?.toUpperCase()} #{c.collector_number} · {c.rarity}</small><button className="btn btn-outline-light btn-sm mt-2 w-100" onClick={() => openCreateModal(c)}>Crear single</button></div></div></div>)}</div>
    {missingSingleCategory && <div className="alert alert-warning d-flex justify-content-between align-items-center">
      <span>No existe la categoría Cartas individuales. Créala antes de publicar singles.</span>
      <button className="btn btn-sm btn-outline-warning" type="button" onClick={createSingleCategory} disabled={saving}>
        <i className="bi bi-plus-circle me-1" />
        Crear categoría Cartas individuales
      </button>
    </div>}
    {selected && <div className="modal d-block" tabIndex="-1" role="dialog"><div className="modal-dialog modal-lg modal-dialog-centered" role="document"><div className="modal-content bg-dark text-light"><div className="modal-header"><h5 className="modal-title">Crear single: {selected.name}</h5><button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={() => setSelected(null)} /></div><div className="modal-body"><div className="row g-3"><div className="col-md-4">{selectedImage && <img src={selectedImage} className="img-fluid scryfall-card-img" alt={selected.name} />}</div><div className="col-md-8"><div className="row g-2">
      <div className="col-md-6"><label className="form-label">Categoría</label><select className="form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Selecciona categoría</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
      <div className="col-12"><div className="alert alert-info"><strong>Precio base:</strong> ${pricingPreview?.usd || 0} USD<br /><strong>Precio sugerido:</strong> ${Number(pricingPreview?.suggested || 0).toLocaleString('es-CL')} CLP <span title="Este precio considera costos de importación, tipo de cambio y margen del negocio">ⓘ</span><br /><small>Tipo cambio: 1000 · Importación: +30% · Riesgo: +10% · Margen: +25%</small></div></div>
      <div className="col-md-6"><label className="form-label">Precio CLP final (editable)</label><input type="number" min="0" className="form-control" value={form.price_clp} onChange={(e) => setForm({ ...form, price_clp: Number(e.target.value) })} /></div>
            <div className="col-md-6"><label className="form-label">Condición</label><select className="form-select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{conditions.map((it) => <option key={it}>{it}</option>)}</select></div>
      <div className="col-md-6"><label className="form-label">Idioma</label><input className="form-control" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
      <div className="col-md-6 d-flex gap-3 align-items-center"><div className="form-check"><input className="form-check-input" type="checkbox" checked={form.is_foil} onChange={(e) => setForm({ ...form, is_foil: e.target.checked })} /><label className="form-check-label">Foil</label></div><div className="form-check"><input className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /><label className="form-check-label">Activo</label></div></div>
      <div className="col-12"><label className="form-label">Notas</label><textarea className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
    </div></div></div></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancelar</button><button type="button" className="btn btn-success" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar single'}</button></div></div></div></div>}
  </div>;
}
