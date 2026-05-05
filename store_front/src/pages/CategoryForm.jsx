export default function CategoryForm({
  form,
  saving = false,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="panel-card p-3">
      <div className="mb-3">
        <label className="form-label">Nombre *</label>
        <input
          required
          className="form-control"
          placeholder="Ej: Singles"
          value={form.name || ''}
          onChange={(event) => onChange('name', event.target.value)}
          disabled={saving}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Slug *</label>
        <input
          required
          className="form-control"
          placeholder="Ej: singles"
          value={form.slug || ''}
          onChange={(event) => onChange('slug', event.target.value)}
          disabled={saving}
        />
        <div className="form-text text-muted">
          Identificador para URLs y filtros. Ejemplo: cartas-individuales.
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-control"
          placeholder="Descripción de la categoría"
          rows="3"
          value={form.description || ''}
          onChange={(event) => onChange('description', event.target.value)}
          disabled={saving}
        />
      </div>

      <div className="form-check mb-3">
        <input
          id="is_active"
          className="form-check-input"
          type="checkbox"
          checked={Boolean(form.is_active)}
          onChange={(event) => onChange('is_active', event.target.checked)}
          disabled={saving}
        />

        <label className="form-check-label" htmlFor="is_active">
          Activa
        </label>
      </div>

      <div className="d-flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
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
    </form>
  );
}