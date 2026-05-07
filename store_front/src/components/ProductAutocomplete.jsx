import { useEffect, useMemo, useRef, useState } from 'react';

const getProductImage = (product) => {
  return (
    product?.image ||
    product?.single_card?.mtg_card?.image_small ||
    product?.single_card?.mtg_card?.image_normal ||
    product?.mtg_card?.image_small ||
    product?.mtg_card?.image_normal ||
    ''
  );
};

const getProductEdition = (product) => {
  return (
    product?.single_card?.edition ||
    product?.single_card?.mtg_card?.set_name ||
    product?.sealed_product?.set_code ||
    product?.edition ||
    ''
  );
};

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9# ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getProductType = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type_data?.slug ||
  product?.product_type ||
  '';

const getProductTypeLabel = (product) =>
  product?.product_type_name ||
  product?.product_type?.name ||
  product?.product_type_display ||
  product?.product_type ||
  'Producto';

const getProductTitle = (product) =>
  product?.name || product?.single_card?.mtg_card?.name || `Producto #${product?.id}`;

const getProductMeta = (product) => {
  const type = getProductType(product);

  if (type === 'single') {
    return [
      product?.single_card?.mtg_card?.set_code?.toUpperCase(),
      product?.single_card?.mtg_card?.collector_number,
      product?.single_card?.condition,
      product?.single_card?.language,
      product?.single_card?.is_foil ? 'Foil' : 'Non-foil',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  return [
    getProductTypeLabel(product),
    product?.sealed_product?.sealed_kind,
    product?.sealed_product?.set_name,
    product?.sealed_product?.set_code?.toUpperCase(),
  ]
    .filter(Boolean)
    .join(' · ');
};

const buildProductMeta = (product) => {
  const setCode =
    product?.single_card?.mtg_card?.set_code ||
    product?.sealed_product?.set_code ||
    '-';
  const collectorNumber = product?.single_card?.mtg_card?.collector_number || '-';
  const condition = product?.single_card?.condition || '-';
  const foilText = product?.single_card?.is_foil ? 'Foil' : 'Non Foil';
  const stock =
    product?.stock ??
    product?.stock_qty ??
    product?.quantity_available ??
    product?.inventory_quantity ??
    0;

  return {
    setCode,
    collectorNumber,
    condition,
    foilText,
    stock,
  };
};

const buildSearchText = (product) =>
  normalizeText(
    [
      product?.id,
      product?.name,
      getProductType(product),
      getProductTypeLabel(product),
      product?.description,
      product?.single_card?.mtg_card?.name,
      product?.single_card?.mtg_card?.set_code,
      product?.single_card?.mtg_card?.collector_number,
      product?.single_card?.condition,
      product?.single_card?.language,
      product?.single_card?.is_foil ? 'foil' : 'non foil',
      product?.sealed_product?.set_name,
      product?.sealed_product?.set_code,
      product?.sealed_product?.sealed_kind,
      product?.category?.name,
      product?.category_name,
      product?.edition,
    ]
      .filter(Boolean)
      .join(' ')
  );

export default function ProductAutocomplete({
  products = [],
  placeholder = 'Buscar producto...',
  onSelect,
  selectedLabel,
  onClear,
}) {
  const wrapperRef = useRef(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    const words = normalizedQuery.split(' ').filter(Boolean);

    return products
      .filter((product) => {
        const searchableText = buildSearchText(product);
        if (searchableText.includes(normalizedQuery)) return true;
        return words.every((word) => searchableText.includes(word));
      })
      .slice(0, 10);
  }, [products, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectProduct = (product) => {
    onSelect?.(product);
    setQuery('');
    setOpen(false);
  };

  const clearSelection = () => {
    setQuery('');
    setOpen(false);
    onClear?.();
  };

  return (
    <div className="position-relative" ref={wrapperRef}>
      <div className="input-group">
        <input
          className="form-control"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (filtered.length > 0) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
            }

            if (event.key === 'Enter' && filtered.length === 1) {
              event.preventDefault();
              selectProduct(filtered[0]);
            }
          }}
        />

        {(selectedLabel || query) && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={clearSelection}
            aria-label="Limpiar selección"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {selectedLabel && (
        <small className="text-muted d-block mt-1">
          Seleccionado: <strong>{selectedLabel}</strong>
        </small>
      )}

      {open && filtered.length > 0 && (
        <div
          className="list-group position-absolute w-100 shadow"
          style={{
            zIndex: 20,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filtered.map((product) => {
            const image = getProductImage(product);
            const edition = getProductEdition(product);
            const { stock } = buildProductMeta(product);
            const price = Number(product?.price_clp || 0);
            const cost = Number(product?.last_purchase_cost_clp || 0);
            const title = getProductTitle(product);
            const meta = getProductMeta(product);

            return (
              <button
                type="button"
                key={product.id}
                className="list-group-item list-group-item-action bg-dark text-light border-secondary"
                onClick={() => selectProduct(product)}
              >
                <div className="d-flex align-items-center gap-2">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      style={{
                        width: 36,
                        height: 50,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 50,
                        borderRadius: 4,
                        background: '#333',
                      }}
                    />
                  )}

                  <div>
                    <div className="fw-semibold">
                      {title}
                    </div>
                    <small className="text-muted">
                      {meta || getProductTypeLabel(product)} · Set: {edition || '-'} · ID:{' '}
                      {product.id}
                    </small>
                    <small className="text-muted d-block">
                      Stock: {stock} · Precio: $
                      {price.toLocaleString('es-CL')} · Costo: $
                      {cost.toLocaleString('es-CL')}
                    </small>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
