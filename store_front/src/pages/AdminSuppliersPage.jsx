import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';

const initialForm = {
  name: '',
  rut: '',
  contact_name: '',
  email: '',
  phone: '',
  address: '',
  country: '',
  website: '',
  notes: '',
  is_active: true,
};

const normalizeList = (data) => data?.results || data || [];

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingId);

  const load = async () => {
    setLoading(true);

    try {
      const { data } = await api.getSuppliers();
      setSuppliers(normalizeList(data));
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const search = q.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const text = [
        supplier.name,
        supplier.rut,
        supplier.contact_name,
        supplier.email,
        supplier.phone,
        supplier.country,
        supplier.website,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || text.includes(search);
      const matchesActive =
        !activeFilter || String(supplier.is_active) === activeFilter;

      return matchesSearch && matchesActive;
    });
  }, [suppliers, q, activeFilter]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      rut: supplier.rut || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      country: supplier.country || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      is_active: Boolean(supplier.is_active),
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      notyf.error('El nombre del proveedor es obligatorio.');
      return false;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      notyf.error('El email no tiene un formato válido.');
      return false;
    }

    return true;
  };

  const save = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      rut: form.rut.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      country: form.country.trim(),
      website: form.website.trim(),
      notes: form.notes.trim(),
      is_active: Boolean(form.is_active),
    };

    try {
      if (isEditing) {
        await api.patchSupplier(editingId, payload);
        notyf.success('Proveedor actualizado correctamente.');
      } else {
        await api.createSupplier(payload);
        notyf.success('Proveedor creado correctamente.');
      }

      resetForm();
      await load();
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (supplier) => {
    try {
      await api.patchSupplier(supplier.id, {
        is_active: !supplier.is_active,
      });

      notyf.success(
        supplier.is_active
          ? 'Proveedor desactivado correctamente.'
          : 'Proveedor activado correctamente.'
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
          <h2 className="mb-1">Proveedores</h2>
          <p className="text-muted mb-0">
            Administra proveedores nacionales, tiendas internacionales y contactos de compra.
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

      <form className="panel-card p-3 mb-3" onSubmit={save}>
        <h5 className="mb-3">
          {isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h5>

        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Nombre *</label>
            <input
              className="form-control"
              placeholder="Card Kingdom"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label">RUT / Tax ID</label>
            <input
              className="form-control"
              placeholder="Opcional"
              value={form.rut}
              onChange={(event) => updateForm('rut', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Contacto</label>
            <input
              className="form-control"
              placeholder="Nombre contacto"
              value={form.contact_name}
              onChange={(event) =>
                updateForm('contact_name', event.target.value)
              }
              disabled={saving}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">País</label>
            <input
              className="form-control"
              placeholder="USA, Chile, Japón..."
              value={form.country}
              onChange={(event) => updateForm('country', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="contacto@proveedor.com"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Teléfono</label>
            <input
              className="form-control"
              placeholder="+56 9..."
              value={form.phone}
              onChange={(event) => updateForm('phone', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-5">
            <label className="form-label">Sitio web</label>
            <input
              className="form-control"
              placeholder="https://..."
              value={form.website}
              onChange={(event) => updateForm('website', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Dirección</label>
            <input
              className="form-control"
              placeholder="Dirección del proveedor"
              value={form.address}
              onChange={(event) => updateForm('address', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Notas</label>
            <input
              className="form-control"
              placeholder="Condiciones, tiempos, observaciones..."
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check mb-2">
              <input
                id="supplier-active"
                className="form-check-input"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm('is_active', event.target.checked)
                }
                disabled={saving}
              />
              <label className="form-check-label" htmlFor="supplier-active">
                Activo
              </label>
            </div>
          </div>

          <div className="col-md-3">
            <label className="form-label d-none d-md-block">&nbsp;</label>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={saving}
            >
              {saving
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar proveedor'
                  : 'Crear proveedor'}
            </button>
          </div>
        </div>
      </form>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex flex-wrap gap-2">
          <input
            className="form-control"
            style={{ maxWidth: 320 }}
            placeholder="Buscar proveedor..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />

          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
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

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>País</th>
              <th>Activo</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  Cargando proveedores...
                </td>
              </tr>
            )}

            {!loading && filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No hay proveedores registrados.
                </td>
              </tr>
            )}

            {!loading &&
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div className="fw-semibold">{supplier.name}</div>
                    {supplier.website && (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noreferrer"
                        className="small"
                      >
                        {supplier.website}
                      </a>
                    )}
                  </td>

                  <td>{supplier.contact_name || '-'}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td>{supplier.country || '-'}</td>

                  <td>
                    <span
                      className={`badge ${supplier.is_active ? 'badge-success' : 'badge-error'
                        }`}
                    >
                      {supplier.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => startEdit(supplier)}
                      disabled={saving}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => toggleActive(supplier)}
                      disabled={saving}
                    >
                      {supplier.is_active ? 'Desactivar' : 'Activar'}
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