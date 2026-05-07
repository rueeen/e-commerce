import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initialState = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
  uses_scryfall: false,
  requires_condition: false,
  requires_language: false,
  requires_foil: false,
  manages_stock: true,
  is_sealed: false,
  is_bundle: false,
  is_service: false,
};

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeListResponse = (data) => data?.results || data || [];

export default function AdminProductTypesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialState);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingId);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const load = async () => {
    setLoading(true);

    try {
      const { data } = await api.getProductTypes();
      setItems(normalizeListResponse(data));
    } catch {
      // El apiClient ya muestra el error con notyf.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleNameChange = (value) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isEditing || current.slug ? current.slug : slugify(value),
      uses_scryfall: false,
      requires_condition: false,
      requires_language: false,
      requires_foil: false,
      manages_stock: true,
      is_sealed: false,
      is_bundle: false,
      is_service: false,
      sort_order: 0,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialState);
  };

  const startEdit = (productType) => {
    setEditingId(productType.id);
    setForm({
      name: productType.name || '',
      slug: productType.slug || '',
      description: productType.description || '',
      is_active: Boolean(productType.is_active),
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim(),
    };

    if (!payload.name || !payload.slug) {
      notyf.error('Nombre y slug son obligatorios.');
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        await api.patchProductType(editingId, payload);
        notyf.success('Tipo de producto actualizada correctamente.');
      } else {
        await api.createProductType(payload);
        notyf.success('Tipo de producto creada correctamente.');
      }

      resetForm();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (productType) => {
    try {
      await api.patchProductType(productType.id, {
        is_active: !productType.is_active,
      });

      notyf.success(
        productType.is_active
          ? 'Tipo de producto desactivada correctamente.'
          : 'Tipo de producto activada correctamente.'
      );

      await load();
    } catch {
      // El apiClient ya muestra el error.
    }
  };

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Tipos de producto</h2>
          <p className="text-muted mb-0">
            Administra las tipos de producto usadas por el catálogo de productos.
          </p>
        </div>

        {isEditing && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={resetForm}
            disabled={saving}
          >
            Cancelar edición
          </button>
        )}
      </div>

      <form className="row g-2" onSubmit={submit}>
        <div className="col-md-3">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            placeholder="Ej: Singles"
            value={form.name}
            onChange={(event) => handleNameChange(event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Slug</label>
          <input
            className="form-control"
            placeholder="Ej: singles"
            value={form.slug}
            onChange={(event) => updateForm('slug', event.target.value)}
            onBlur={() => updateForm('slug', slugify(form.slug || form.name))}
            disabled={saving}
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Descripción</label>
          <input
            className="form-control"
            placeholder="Descripción breve"
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="col-md-2">
          <label className="form-label d-none d-md-block">&nbsp;</label>
          <button className="btn btn-primary w-100" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>

      <div className="table-responsive mt-3">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Productos</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  Cargando tipos de producto...
                </td>
              </tr>
            )}

            {!loading && sortedItems.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No hay tipos de producto registradas.
                </td>
              </tr>
            )}

            {!loading &&
              sortedItems.map((productType) => (
                <tr key={productType.id}>
                  <td>{productType.name}</td>
                  <td>
                    <code>{productType.slug}</code>
                  </td>
                  <td>{productType.products_count ?? '-'}</td>
                  <td>
                    <span
                      className={`badge ${productType.is_active ? 'badge-success' : 'badge-error'
                        }`}
                    >
                      {productType.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => startEdit(productType)}
                      disabled={saving}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => toggleStatus(productType)}
                      disabled={saving}
                    >
                      {productType.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}