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

const buildSearchText = (product) => {
  return [
    product?.id,
    product?.name,
    product?.description,
    product?.product_type,
    product?.category?.name,
    product?.category_name,
    product?.single_card?.condition,
    product?.single_card?.language,
    product?.single_card?.mtg_card?.name,
    product?.single_card?.mtg_card?.set_name,
    product?.single_card?.mtg_card?.set_code,
    product?.single_card?.mtg_card?.collector_number,
    product?.sealed_product?.set_code,
    product?.edition,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

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
    const search = query.trim().toLowerCase();

    if (!search) return [];

    return products
      .filter((product) => buildSearchText(product).includes(search))
      .slice(0, 8);
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
                      alt={product.name}
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
                    <div className="fw-semibold">{product.name}</div>
                    <small className="text-muted">
                      {product.product_type || 'producto'} · Set:{' '}
                      {edition || '-'} · ID: {product.id}
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