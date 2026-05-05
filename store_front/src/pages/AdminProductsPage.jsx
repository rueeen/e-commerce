import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ExcelImportBox from '../components/ExcelImportBox';
import ProductForm, {
  CONDITION_OPTIONS,
  LANGUAGE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  initialFormState,
} from '../components/ProductForm';
import ProductTable from '../components/ProductTable';

const normalizeList = (data) => data?.results || data || [];

const normalizeProductForForm = (product) => {
  const singleCard = product.single_card || {};
  const mtgCard = singleCard.mtg_card || {};

  return {
    ...initialFormState,
    name: product.name || '',
    category_id: String(product.category_id || product.category?.id || ''),
    description: product.description || '',
    product_type: product.product_type || initialFormState.product_type,
    price_clp:
      product.price_clp === 0
        ? '0'
        : String(product.price_clp || ''),
    stock:
      product.stock === 0
        ? '0'
        : String(product.stock || ''),
    stock_minimum:
      product.stock_minimum === 0
        ? '0'
        : String(product.stock_minimum || ''),
    image: product.image || '',
    is_active: Boolean(product.is_active),
    notes: product.notes || '',

    mtg_card_id: String(mtgCard.id || singleCard.mtg_card_id || ''),
    condition: singleCard.condition || initialFormState.condition,
    language: singleCard.language || initialFormState.language,
    is_foil: Boolean(singleCard.is_foil),
    edition: singleCard.edition || '',

    sealed_kind: product.sealed_product?.sealed_kind || initialFormState.sealed_kind,
    set_code: product.sealed_product?.set_code || '',
  };
};

const getProductCategoryId = (product) => {
  return String(product.category_id || product.category?.id || '');
};

const getProductCondition = (product) => {
  return product.single_card?.condition || product.condition || '';
};

const getProductLanguage = (product) => {
  return product.single_card?.language || product.language || '';
};

const getProductIsFoil = (product) => {
  if (product.single_card && typeof product.single_card.is_foil === 'boolean') {
    return product.single_card.is_foil;
  }

  return Boolean(product.is_foil);
};

const buildProductPayload = (form) => {
  return {
    name: form.name?.trim() || '',
    category_id: form.category_id ? Number(form.category_id) : null,
    description: form.description || '',
    product_type: form.product_type,
    price_clp: Number(form.price_clp || 0),
    stock: Number(form.stock || 0),
    stock_minimum: Number(form.stock_minimum || 0),
    image: form.image || '',
    is_active: Boolean(form.is_active),
    notes: form.notes || '',

    mtg_card_id: form.mtg_card_id ? Number(form.mtg_card_id) : null,
    condition: form.condition,
    language: form.language,
    is_foil: Boolean(form.is_foil),
    edition: form.edition || '',

    sealed_kind: form.sealed_kind || '',
    set_code: form.set_code || '',
  };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialFormState);

  const [importResult, setImportResult] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardQuery, setCardQuery] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    q: '',
    category: '',
    type: '',
    active: '',
    condition: '',
    is_foil: '',
    language: '',
  });

  const load = async () => {
    setLoading(true);

    try {
      const [{ data: productsData }, { data: categoriesData }] =
        await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);

      setProducts(normalizeList(productsData));
      setCategories(normalizeList(categoriesData));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm(initialFormState);
    setCards([]);
    setCardQuery('');
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = buildProductPayload(form);

    if (!payload.name) {
      notyf.error('El nombre del producto es obligatorio.');
      return;
    }

    if (!payload.product_type) {
      notyf.error('El tipo de producto es obligatorio.');
      return;
    }

    if (payload.price_clp < 0) {
      notyf.error('El precio no puede ser negativo.');
      return;
    }

    if (payload.stock < 0) {
      notyf.error('El stock no puede ser negativo.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await api.patchProduct(editing.id, payload);
        notyf.success('Producto actualizado correctamente.');
      } else {
        await api.createProduct(payload);
        notyf.success('Producto creado correctamente.');
      }

      resetForm();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (product) => {
    setEditing(product);
    setForm(normalizeProductForForm(product));

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const searchCards = async () => {
    const query = cardQuery.trim();

    if (!query) {
      notyf.error('Ingresa un nombre para buscar.');
      return;
    }

    try {
      const { data } = await api.searchMtgCards(query);
      setCards(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  const selectCard = (card) => {
    onChange('mtg_card_id', String(card.id));
    onChange('name', card.name || form.name);
    onChange('image', card.image_large || card.image_normal || card.image_small || form.image);
    onChange('edition', card.set_name || form.edition);
    onChange('description', card.oracle_text || card.type_line || form.description);
    onChange('set_code', card.set_code || form.set_code);
  };

  const onImport = async (file) => {
    if (isImporting) return;

    setIsImporting(true);

    try {
      const { data } = await api.importCatalogXlsx(file);
      setImportResult(data);
      notyf.success('Importación completada.');
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setIsImporting(false);
    }
  };

  const toggleActive = async (product) => {
    try {
      await api.patchProduct(product.id, {
        is_active: !product.is_active,
      });

      notyf.success(
        product.is_active
          ? 'Producto desactivado correctamente.'
          : 'Producto activado correctamente.'
      );

      await load();
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  const deleteProduct = async (product) => {
    const ok = window.confirm(
      `¿Seguro que quieres eliminar "${product.name}"? Esta acción no se puede deshacer.`
    );

    if (!ok) return;

    try {
      await api.deleteProduct(product.id);
      notyf.success('Producto eliminado correctamente.');
      await load();
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  const updateFilter = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      category: '',
      type: '',
      active: '',
      condition: '',
      is_foil: '',
      language: '',
    });
  };

  const filtered = useMemo(() => {
    const search = filters.q.trim().toLowerCase();

    return products.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        description.includes(search);

      const matchesCategory =
        !filters.category ||
        getProductCategoryId(product) === filters.category;

      const matchesType =
        !filters.type ||
        product.product_type === filters.type;

      const matchesActive =
        !filters.active ||
        String(product.is_active) === filters.active;

      const matchesCondition =
        !filters.condition ||
        getProductCondition(product) === filters.condition;

      const matchesFoil =
        !filters.is_foil ||
        String(getProductIsFoil(product)) === filters.is_foil;

      const matchesLanguage =
        !filters.language ||
        getProductLanguage(product) === filters.language;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesActive &&
        matchesCondition &&
        matchesFoil &&
        matchesLanguage
      );
    });
  }, [products, filters]);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Mantenedor de productos MTG</h2>
          <p className="text-muted mb-0">
            Administra singles, productos sellados, bundles e importaciones del catálogo.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <ExcelImportBox
        title="Importar catálogo"
        columns={[
          'type',
          'name',
          'category',
          'description',
          'price_clp',
          'image',
          'is_active',
          'notes',
          'scryfall_id',
          'condition',
          'language',
          'is_foil',
          'sealed_kind',
          'set_code',
          'set_name',
        ]}
        buttonLabel="Importar XLSX"
        onImport={onImport}
        result={importResult}
        isImporting={isImporting}
      />

      <ProductForm
        form={form}
        categories={categories}
        cards={cards}
        cardQuery={cardQuery}
        setCardQuery={setCardQuery}
        onCardSearch={searchCards}
        onCardSelect={selectCard}
        onChange={onChange}
        onSubmit={submit}
        submitLabel={editing ? 'Actualizar producto' : 'Crear producto'}
        saving={saving}
        onCancel={editing ? resetForm : null}
      />

      <div className="panel-card p-3 mt-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-1">Listado de productos</h5>
            <p className="text-muted mb-0">
              {filtered.length} producto(s) encontrados.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="Buscar por nombre"
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
            />
          </div>

          <div className="col-md-2">
            <select
              className="form-select"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="">Categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <select
              className="form-select"
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value)}
            >
              <option value="">Tipos</option>
              {PRODUCT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <select
              className="form-select"
              value={filters.active}
              onChange={(event) => updateFilter('active', event.target.value)}
            >
              <option value="">Estado</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <div className="col-md-1">
            <select
              className="form-select"
              value={filters.condition}
              onChange={(event) => updateFilter('condition', event.target.value)}
            >
              <option value="">Cond.</option>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-1">
            <select
              className="form-select"
              value={filters.is_foil}
              onChange={(event) => updateFilter('is_foil', event.target.value)}
            >
              <option value="">Foil</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="col-md-1">
            <select
              className="form-select"
              value={filters.language}
              onChange={(event) => updateFilter('language', event.target.value)}
            >
              <option value="">Idioma</option>
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted py-4">
            Cargando productos...
          </div>
        ) : (
          <ProductTable
            products={filtered}
            onEdit={onEdit}
            onToggleActive={toggleActive}
            onDelete={deleteProduct}
            onViewKardex={(product) =>
              window.location.assign(`/admin/kardex?product_id=${product.id}`)
            }
            onCreatePO={(product) =>
              window.location.assign(`/admin/ordenes-compra?product_id=${product.id}`)
            }
          />
        )}
      </div>
    </>
  );
}