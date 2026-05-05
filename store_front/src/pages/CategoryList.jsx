import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/endpoints';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

const normalizeList = (data) => data?.results || data || [];

export default function CategoryList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setSearching(true);
    setError('');

    try {
      const params = {};

      if (q.trim()) {
        params.search = q.trim();
      }

      if (activeFilter) {
        params.is_active = activeFilter;
      }

      const { data } = await api.getCategories(params);
      setItems(normalizeList(data));
    } catch {
      setError('No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    load();
  };

  const clearFilters = () => {
    setQ('');
    setActiveFilter('');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="panel-card p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Categorías</h2>
          <p className="text-muted mb-0">
            Lista de categorías disponibles para el catálogo.
          </p>
        </div>

        <Link className="btn btn-primary" to="/admin/categorias/crear">
          Crear categoría
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}

      <form className="row g-2 mb-3" onSubmit={submitSearch}>
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Buscar por nombre o slug"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>

        <div className="col-md-3 d-flex gap-2">
          <button
            type="submit"
            className="btn btn-outline-primary flex-fill"
            disabled={searching}
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={clearFilters}
            disabled={searching}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div className="table-responsive">
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
            {items.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
                  No hay categorías para mostrar.
                </td>
              </tr>
            )}

            {items.map((category) => (
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
                  <Link
                    to={`/admin/categorias/${category.id}/editar`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}