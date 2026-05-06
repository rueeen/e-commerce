import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';
import { fetchAllPaginated } from '../api/pagination';
import { notyf } from '../api/notifier';
import ProductForm, {
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

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(initialFormState);

  const [cards, setCards] = useState([]);
  const [cardQuery, setCardQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const [productsData, { data: categoriesData }] = await Promise.all([
        fetchAllPaginated(api.getProducts),
        api.getCategories(),
      ]);

      setProducts(productsData);
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
    setEditingProduct(null);
    setForm(initialFormState);
    setCards([]);
    setCardQuery('');
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    resetForm();
  };

  const openCreateProductModal = () => {
    resetForm();
    setShowProductModal(true);
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
      if (editingProduct) {
        await api.patchProduct(editingProduct.id, payload);
        notyf.success('Producto actualizado correctamente.');
      } else {
        await api.createProduct(payload);
        notyf.success('Producto creado correctamente.');
      }

      closeProductModal();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (product) => {
    setEditingProduct(product);
    setForm(normalizeProductForForm(product));
    setShowProductModal(true);
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

  const toggleActive = async (product) => {
    const nextActive = !product.is_active;
    const margin = Number(product.margin_clp || 0);

    if (nextActive && margin < 0) {
      const ok = window.confirm('Este producto tiene margen negativo. ¿Activar de todas formas?');
      if (!ok) return;
    }

    try {
      await api.patchProduct(product.id, {
        is_active: nextActive,
      });

      notyf.success(
        product.is_active
          ? 'Producto desactivado correctamente.'
          : margin < 0
            ? 'Producto activado con advertencia de margen negativo.'
            : 'Producto activado correctamente.'
      );

      await load();
    } catch {
      // El apiClient ya muestra el error.
    }
  };


  const applySuggestedPrice = async (product) => {
    try {
      await api.applySuggestedPrice(product.id);
      notyf.success('Precio sugerido aplicado correctamente.');
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

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Mantenedor de productos MTG</h2>
          <p className="text-muted mb-0">
            Administra singles y productos sellados. Para compras a proveedores usa órdenes de compra.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateProductModal}
        >
          Nuevo producto
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="panel-card p-3 mt-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-1">Listado de productos</h5>
            <p className="text-muted mb-0">
              {products.length} producto(s) encontrados.
            </p>
            <p className="text-warning small mb-0">
              Solo los productos activos aparecen en la tienda pública.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted py-4">
            Cargando productos...
          </div>
        ) : (
          <ProductTable
            products={products}
            onEdit={onEdit}
            onToggleActive={toggleActive}
            onDelete={deleteProduct}
            onApplySuggestedPrice={applySuggestedPrice}
            onViewKardex={(product) =>
              window.location.assign(`/admin/kardex?product_id=${product.id}`)
            }
            onCreatePO={(product) =>
              window.location.assign(`/admin/ordenes-compra?product_id=${product.id}`)
            }
          />
        )}
      </div>

      {showProductModal && (
        <>
          <div
            className="modal fade show d-block admin-product-modal"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingProduct ? 'Editar producto' : 'Crear producto'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={closeProductModal}
                  />
                </div>

                <div className="modal-body">
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
                    submitLabel={editingProduct ? 'Actualizar producto' : 'Guardar'}
                    saving={saving}
                    onCancel={closeProductModal}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show admin-product-modal-backdrop" />
        </>
      )}
    </>
  );
}
