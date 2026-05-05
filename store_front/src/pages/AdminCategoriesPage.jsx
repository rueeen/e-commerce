import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initialState = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
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

export default function AdminCategoriesPage() {
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
      const { data } = await api.getCategories();
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
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialState);
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      is_active: Boolean(category.is_active),
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
        await api.patchCategory(editingId, payload);
        notyf.success('Categoría actualizada correctamente.');
      } else {
        await api.createCategory(payload);
        notyf.success('Categoría creada correctamente.');
      }

      resetForm();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category) => {
    try {
      await api.patchCategory(category.id, {
        is_active: !category.is_active,
      });

      notyf.success(
        category.is_active
          ? 'Categoría desactivada correctamente.'
          : 'Categoría activada correctamente.'
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
          <h2 className="mb-1">Categorías</h2>
          <p className="text-muted mb-0">
            Administra las categorías usadas por el catálogo de productos.
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
                  Cargando categorías...
                </td>
              </tr>
            )}

            {!loading && sortedItems.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No hay categorías registradas.
                </td>
              </tr>
            )}

            {!loading &&
              sortedItems.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>
                    <code>{category.slug}</code>
                  </td>
                  <td>{category.products_count ?? '-'}</td>
                  <td>
                    <span
                      className={`badge ${category.is_active ? 'badge-success' : 'badge-error'
                        }`}
                    >
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => startEdit(category)}
                      disabled={saving}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => toggleStatus(category)}
                      disabled={saving}
                    >
                      {category.is_active ? 'Desactivar' : 'Activar'}
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