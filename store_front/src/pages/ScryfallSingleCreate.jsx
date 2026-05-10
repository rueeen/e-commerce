import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import { formatMoney } from '../utils/format';

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const LANGUAGES = ['EN', 'ES', 'JP', 'DE', 'FR', 'IT', 'PT'];

const initialForm = {
  category_id: '',
  price_clp: '',
  condition: 'NM',
  language: 'EN',
  is_foil: false,
  is_active: true,
  notes: '',
};

const fallbackPricing = {
  usd_to_clp: 1000,
  import_factor: 1.3,
  risk_factor: 1.1,
  margin_factor: 1.25,
  rounding_to: 100,
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeCategoryName = (value) =>
  String(value || '').trim().toLowerCase();

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function getCardImage(card) {
  return (
    card?.image_large ||
    card?.image_normal ||
    card?.image_small ||
    card?.image_uris?.large ||
    card?.image_uris?.normal ||
    card?.image_uris?.small ||
    card?.card_faces?.[0]?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.small ||
    ''
  );
}

function getCardPrices(card) {
  const prices = card?.prices || {};

  return {
    usd: Number(card?.usd_price || prices.usd || 0),
    usdFoil: Number(card?.usd_foil_price || prices.usd_foil || 0),
    usdEtched: Number(card?.usd_etched_price || prices.usd_etched || 0),
  };
}

function getUsdReference(card, isFoil) {
  const { usd, usdFoil, usdEtched } = getCardPrices(card);

  if (isFoil) {
    return usdFoil || usdEtched || usd || 0;
  }

  return usd || usdFoil || usdEtched || 0;
}

function roundTo(value, roundingTo) {
  const base = Number(roundingTo || 1);

  if (base <= 1) {
    return Math.round(value);
  }

  return Math.round(value / base) * base;
}

function calculateSuggestedPrice(card, isFoil, pricing) {
  const usd = getUsdReference(card, isFoil);
  const settings = pricing || fallbackPricing;

  const raw =
    usd *
    Number(settings.usd_to_clp || fallbackPricing.usd_to_clp) *
    Number(settings.import_factor || fallbackPricing.import_factor) *
    Number(settings.risk_factor || fallbackPricing.risk_factor) *
    Number(settings.margin_factor || fallbackPricing.margin_factor);

  return {
    usd,
    suggested: roundTo(raw, settings.rounding_to || 100),
  };
}

function findSingleCategory(categories) {
  const preferredNames = [
    'cartas individuales',
    'carta individual',
    'singles',
    'single',
  ];

  return categories.find((category) =>
    preferredNames.includes(normalizeCategoryName(category.name))
  );
}

export default function ScryfallSingleCreate() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(fallbackPricing);

  const [form, setForm] = useState(initialForm);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [missingSingleCategory, setMissingSingleCategory] = useState(false);

  const selectedImage = useMemo(() => getCardImage(selected), [selected]);

  const loadCategories = async () => {
    const { data } = await api.getCategories();
    const loaded = normalizeList(data);

    setCategories(loaded);

    const singleCategory = findSingleCategory(loaded);
    setMissingSingleCategory(!singleCategory);

    if (singleCategory) {
      setForm((current) => ({
        ...current,
        category_id: String(singleCategory.id),
      }));
    }
  };

  const loadPricingSettings = async () => {
    try {
      const { data } = await api.getActivePricingSettings();

      setPricingSettings({
        ...fallbackPricing,
        ...data,
      });
    } catch {
      setPricingSettings(fallbackPricing);
    }
  };

  useEffect(() => {
    loadCategories();
    loadPricingSettings();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const createSingleCategory = async () => {
    setSaving(true);

    try {
      await api.createCategory({
        name: 'Cartas individuales',
        slug: 'cartas-individuales',
        description: 'Cartas single de Magic: The Gathering.',
        is_active: true,
      });

      await loadCategories();
      notyf.success('Categoría Cartas individuales creada correctamente.');
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const search = async () => {
    const query = q.trim();

    if (!query) {
      notyf.error('Ingresa una carta para buscar.');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const { data } = await api.searchScryfallCards(query);
      setResults(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (card) => {
    const preview = calculateSuggestedPrice(
      card,
      Boolean(initialForm.is_foil),
      pricingSettings
    );

    setPricingPreview(preview);
    setSelected(card);

    setForm((current) => ({
      ...initialForm,
      category_id: current.category_id,
      price_clp: preview.suggested || 0,
    }));
  };

  const handleFoilChange = (checked) => {
    updateForm('is_foil', checked);

    if (selected) {
      const preview = calculateSuggestedPrice(selected, checked, pricingSettings);
      setPricingPreview(preview);
      updateForm('price_clp', preview.suggested || 0);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setPricingPreview(null);
    setForm((current) => ({
      ...initialForm,
      category_id: current.category_id,
    }));
  };

  const submit = async () => {
    if (!selected) return;

    if (!form.category_id) {
      notyf.error('Debes seleccionar una categoría.');
      return;
    }

    if (form.price_clp === '' || Number(form.price_clp) < 0) {
      notyf.error('Debes ingresar un precio final válido.');
      return;
    }

    setSaving(true);

    try {
      await api.createSingleFromScryfall({
        scryfall_id: selected.id || selected.scryfall_id,
        category_id: Number(form.category_id),
        price_clp: Number(form.price_clp || 0),
        condition: form.condition,
        language: String(form.language || 'EN').trim().toUpperCase(),
        is_foil: Boolean(form.is_foil),
        is_active: Boolean(form.is_active),
        notes: form.notes || '',
      });

      notyf.success('Single creado correctamente.');
      closeModal();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h3 className="mb-1">Crear single desde Scryfall</h3>
          <p className="text-muted mb-0">
            Busca una carta en Scryfall y crea un producto single sin modificar stock.
          </p>
        </div>
      </div>

      <div className="alert alert-info">
        El stock se ingresa mediante orden de compra, recepción, lotes FIFO y Kardex.
      </div>

      {missingSingleCategory && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>
            No existe una categoría para singles. Créala antes de publicar cartas individuales.
          </span>

          <button
            className="btn btn-sm btn-outline-warning"
            type="button"
            onClick={createSingleCategory}
            disabled={saving}
          >
            <i className="bi bi-plus-circle me-1" />
            Crear categoría Cartas individuales
          </button>
        </div>
      )}

      <div className="input-group mb-3">
        <input
          className="form-control"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') search();
          }}
          placeholder="Buscar: Cloud, Sauron, Lightning Bolt..."
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={search}
          disabled={loading}
        >
          <i className="bi bi-search me-1" />
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {loading ? (
        <div className="panel-card p-4 text-center text-muted">
          Buscando cartas en Scryfall...
        </div>
      ) : results.length === 0 ? (
        <div className="panel-card p-4 text-center text-muted">
          No hay resultados para mostrar.
        </div>
      ) : (
        <div className="row g-3">
          {results.map((card) => (
            <div className="col-md-3" key={card.id || card.scryfall_id}>
              <div className="card h-100">
                {getCardImage(card) ? (
                  <img
                    src={getCardImage(card)}
                    className="card-img-top scryfall-card-img"
                    alt={card.name}
                  />
                ) : (
                  <div className="scryfall-card-img d-flex align-items-center justify-content-center text-muted">
                    Sin imagen
                  </div>
                )}

                <div className="card-body">
                  <h6>{card.name}</h6>

                  <small className="text-muted">
                    {(card.set || card.set_code || '').toUpperCase()} #
                    {card.collector_number} · {card.rarity}
                  </small>

                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm mt-2 w-100"
                    onClick={() => openCreateModal(card)}
                  >
                    Crear single
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content bg-dark text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title">Crear single: {selected.name}</h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Cerrar"
                  onClick={closeModal}
                />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    {selectedImage && (
                      <img
                        src={selectedImage}
                        className="img-fluid scryfall-card-img"
                        alt={selected.name}
                      />
                    )}
                  </div>

                  <div className="col-md-8">
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label">Categoría</label>
                        <select
                          className="form-select"
                          value={form.category_id}
                          onChange={(event) =>
                            updateForm('category_id', event.target.value)
                          }
                        >
                          <option value="">Selecciona categoría</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Condición</label>
                        <select
                          className="form-select"
                          value={form.condition}
                          onChange={(event) =>
                            updateForm('condition', event.target.value)
                          }
                        >
                          {CONDITIONS.map((condition) => (
                            <option key={condition} value={condition}>
                              {condition}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <div className="alert alert-info">
                          <strong>Precio base:</strong>{' '}
                          {pricingPreview?.usd || 0} USD
                          <br />
                          <strong>Precio sugerido:</strong>{' '}
                          {formatMoney(pricingPreview?.suggested)}
                          <br />
                          <small>
                            Tipo cambio: {pricingSettings.usd_to_clp} ·
                            Importación: +{Math.round((pricingSettings.import_factor - 1) * 100)}% ·
                            Riesgo: +{Math.round((pricingSettings.risk_factor - 1) * 100)}% ·
                            Margen: +{Math.round((pricingSettings.margin_factor - 1) * 100)}% ·
                            Redondeo: {pricingSettings.rounding_to}
                          </small>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Precio CLP final</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={form.price_clp}
                          onChange={(event) =>
                            updateForm('price_clp', event.target.value)
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Idioma</label>
                        <select
                          className="form-select"
                          value={form.language}
                          onChange={(event) =>
                            updateForm('language', event.target.value)
                          }
                        >
                          {LANGUAGES.map((language) => (
                            <option key={language} value={language}>
                              {language}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6 d-flex gap-3 align-items-center">
                        <div className="form-check">
                          <input
                            id="single-is-foil"
                            className="form-check-input"
                            type="checkbox"
                            checked={form.is_foil}
                            onChange={(event) =>
                              handleFoilChange(event.target.checked)
                            }
                          />

                          <label
                            className="form-check-label"
                            htmlFor="single-is-foil"
                          >
                            Foil
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            id="single-is-active"
                            className="form-check-input"
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(event) =>
                              updateForm('is_active', event.target.checked)
                            }
                          />

                          <label
                            className="form-check-label"
                            htmlFor="single-is-active"
                          >
                            Activo
                          </label>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Notas</label>
                        <textarea
                          className="form-control"
                          value={form.notes}
                          onChange={(event) => updateForm('notes', event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={submit}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar single'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}