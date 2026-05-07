import ProductAutocomplete from './ProductAutocomplete';

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'single', label: 'Carta individual' },
  { value: 'sealed', label: 'Producto sellado' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'accessory', label: 'Accesorio' },
  { value: 'service', label: 'Servicio / encargo' },
  { value: 'other', label: 'Otro' },
];

export const CONDITION_OPTIONS = [
  { value: 'NM', label: 'Near Mint' },
  { value: 'LP', label: 'Lightly Played' },
  { value: 'MP', label: 'Moderately Played' },
  { value: 'HP', label: 'Heavily Played' },
  { value: 'DMG', label: 'Damaged' },
];

export const LANGUAGE_OPTIONS = ['EN', 'ES', 'JP', 'PT', 'IT', 'DE', 'FR'];

export const SEALED_KIND_OPTIONS = [
  { value: '', label: 'No aplica' },
  { value: 'booster_box', label: 'Booster Box' },
  { value: 'bundle', label: 'Bundle sellado' },
  { value: 'commander_deck', label: 'Commander Deck' },
  { value: 'precon', label: 'Precon' },
  { value: 'starter_kit', label: 'Starter Kit' },
  { value: 'collector_booster', label: 'Collector Booster' },
  { value: 'other', label: 'Otro' },
];

export const initialFormState = {
  name: '',
  description: '',
  product_type: 'single',

  mtg_card_id: '',
  condition: 'NM',
  language: 'EN',
  is_foil: false,
  edition: '',

  sealed_kind: '',
  set_code: '',

  image: '',
  price_clp: '',
  stock: '0',
  stock_minimum: '0',
  notes: '',
  is_active: true,
};

const formatMoney = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getCardImage = (card) => {
  return (
    card?.image_small ||
    card?.image_normal ||
    card?.image_large ||
    card?.image_uris?.small ||
    card?.image_uris?.normal ||
    card?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.small ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    ''
  );
};

const getSetCode = (card) => {
  return card?.set_code || card?.set || '';
};

export default function ProductForm({
  form,
  cards = [],
  cardQuery = '',
  setCardQuery,
  onCardSearch,
  onCardSelect,
  onChange,
  onSubmit,
  onCancel,
  productOptions = [],
  bundleItems = [],
  onAddBundleItem,
  onRemoveBundleItem,
  canEditBundleItems = false,
  submitLabel = 'Guardar producto',
  saving = false,
}) {
  const isSingle = form.product_type === 'single';
  const isSealed = form.product_type === 'sealed';
  const isBundle = form.product_type === 'bundle';

  return (
    <form className="panel-card p-3 admin-product-form" onSubmit={onSubmit}>
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label">Tipo de producto</label>
          <select
            className="form-select"
            value={form.product_type}
            onChange={(event) => onChange('product_type', event.target.value)}
            disabled={saving}
          >
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>


        {isSingle && (
          <>
            <div className="col-12">
              <h6 className="text-uppercase text-secondary mb-1">Datos MTG</h6>
            </div>

            <div className="col-md-8">
              <label className="form-label">Buscar carta MTG</label>
              <div className="input-group">
                <input
                  className="form-control"
                  placeholder="Buscar carta MTG por nombre"
                  value={cardQuery}
                  onChange={(event) => setCardQuery?.(event.target.value)}
                  disabled={saving}
                />
                <button
                  type="button"
                  className="btn btn-outline-light"
                  onClick={onCardSearch}
                  disabled={saving}
                >
                  Buscar
                </button>
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label">Edición</label>
              <input
                className="form-control"
                placeholder="Edición"
                value={form.edition || ''}
                onChange={(event) => onChange('edition', event.target.value)}
                disabled={saving}
              />
            </div>

            {cards.length > 0 && (
              <div className="col-12">
                <div className="row g-2">
                  {cards.map((card) => {
                    const image = getCardImage(card);
                    const setCode = getSetCode(card);

                    return (
                      <div className="col-md-6" key={card.id || card.scryfall_id}>
                        <button
                          type="button"
                          className="btn btn-dark w-100 text-start d-flex gap-2 align-items-center"
                          onClick={() => onCardSelect?.(card)}
                          disabled={saving}
                        >
                          {image && (
                            <img
                              src={image}
                              alt={card.name}
                              width="40"
                              style={{ borderRadius: 4 }}
                            />
                          )}
                          <span>
                            {card.name} · {String(setCode).toUpperCase()} ·{' '}
                            {card.rarity || 'sin rareza'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="col-md-3">
              <label className="form-label">Condición</label>
              <select
                className="form-select"
                value={form.condition}
                onChange={(event) => onChange('condition', event.target.value)}
                disabled={saving}
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Idioma</label>
              <select
                className="form-select"
                value={form.language}
                onChange={(event) => onChange('language', event.target.value)}
                disabled={saving}
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check">
                <input
                  id="foil"
                  className="form-check-input"
                  type="checkbox"
                  checked={Boolean(form.is_foil)}
                  onChange={(event) => onChange('is_foil', event.target.checked)}
                  disabled={saving}
                />
                <label htmlFor="foil" className="form-check-label">
                  Foil
                </label>
              </div>
            </div>
          </>
        )}

        {isSealed && (
          <>
            <div className="col-12">
              <h6 className="text-uppercase text-secondary mb-1">
                Datos de producto sellado
              </h6>
            </div>

            <div className="col-md-4">
              <label className="form-label">Tipo de sellado</label>
              <select
                className="form-select"
                value={form.sealed_kind || ''}
                onChange={(event) => onChange('sealed_kind', event.target.value)}
                disabled={saving}
              >
                {SEALED_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Código de set</label>
              <input
                className="form-control"
                placeholder="Ej: FIN, LTC, WHO"
                value={form.set_code || ''}
                onChange={(event) =>
                  onChange('set_code', event.target.value.toUpperCase())
                }
                disabled={saving}
              />
            </div>
          </>
        )}

        {isBundle && (
          <div className="col-12 mt-3">
            <h6 className="text-uppercase text-secondary mb-2">Componentes del bundle</h6>

            {!canEditBundleItems ? (
              <p className="text-secondary small mb-0">
                Guarda el bundle primero para agregar componentes.
              </p>
            ) : (
              <>
                {bundleItems.length === 0 && (
                  <p className="text-secondary small">
                    Sin componentes. Agrega productos al bundle.
                  </p>
                )}

                {bundleItems.map((bi) => (
                  <div key={bi.id} className="d-flex align-items-center gap-2 mb-2">
                    <span className="flex-grow-1">{bi.item_name}</span>
                    <span className="badge badge-soft">x{bi.quantity}</span>
                    <span className="text-secondary small">{formatMoney(bi.item_price_clp)}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onRemoveBundleItem?.(bi.item)}
                      disabled={saving}
                    >
                      Quitar
                    </button>
                  </div>
                ))}

                <div className="d-flex gap-2 mt-2">
                  <div className="flex-grow-1">
                    <ProductAutocomplete
                      products={productOptions}
                      placeholder="Buscar producto componente..."
                      onSelect={(product) => {
                        if (product?.product_type === 'bundle') return;
                        onAddBundleItem?.(product, 1);
                      }}
                    />
                  </div>
                </div>

                {bundleItems.length > 0 && (
                  <div className="mt-2 text-end text-secondary small">
                    Precio total bundle:{' '}
                    {formatMoney(
                      bundleItems.reduce(
                        (sum, bi) => sum + Number(bi.item_price_clp || 0) * Number(bi.quantity || 0),
                        0
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="col-12">
          <h6 className="text-uppercase text-secondary mb-1">Datos del producto</h6>
        </div>

        <div className="col-md-6">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            required
            disabled={saving}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">URL imagen</label>
          <input
            className="form-control"
            placeholder="URL imagen"
            value={form.image}
            onChange={(event) => onChange('image', event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-12">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            rows="2"
            placeholder="Descripción"
            value={form.description}
            onChange={(event) => onChange('description', event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-12">
          <label className="form-label">Notas internas</label>
          <textarea
            className="form-control"
            rows="2"
            placeholder="Notas"
            value={form.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-12">
          <h6 className="text-uppercase text-secondary mb-1">Precio y stock</h6>
        </div>

        <div className="col-md-3">
          <label className="form-label">Precio CLP</label>
          <input
            className="form-control"
            type="number"
            min="0"
            placeholder="Precio CLP"
            value={form.price_clp ?? ''}
            onChange={(event) => onChange('price_clp', event.target.value)}
            required
            disabled={saving}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Stock inicial</label>
          <input
            className="form-control"
            type="number"
            min="0"
            placeholder="Stock"
            value={form.stock ?? '0'}
            onChange={(event) => onChange('stock', event.target.value)}
            disabled={saving}
          />
          <small className="text-muted">
            Idealmente usar órdenes de compra o Kardex.
          </small>
        </div>

        <div className="col-md-3">
          <label className="form-label">Stock mínimo</label>
          <input
            className="form-control"
            type="number"
            min="0"
            placeholder="Stock mínimo"
            value={form.stock_minimum ?? '0'}
            onChange={(event) => onChange('stock_minimum', event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-md-3">
          <div className="alert alert-secondary mb-0 h-100">
            El stock operativo se debe gestionar mediante Kardex, órdenes de
            compra o movimientos autorizados.
          </div>
        </div>

        <div className="col-12 d-flex gap-2 product-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : submitLabel}
          </button>

          {onCancel && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
