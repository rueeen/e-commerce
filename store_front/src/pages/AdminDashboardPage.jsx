import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';

const initialStats = {
  products: 0,
  categories: 0,
  users: 0,
  orders: 0,
};

const statLabels = {
  products: 'Productos',
  categories: 'Categorías',
  users: 'Usuarios',
  orders: 'Órdenes',
};

const statIcons = {
  products: 'bi-box-seam',
  categories: 'bi-tags',
  users: 'bi-people',
  orders: 'bi-receipt',
};

const getCount = (response) => {
  const data = response?.data;

  if (!data) return 0;

  if (typeof data.count === 'number') {
    return data.count;
  }

  if (Array.isArray(data.results)) {
    return data.results.length;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  return 0;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(initialStats);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  const cards = useMemo(
    () => [
      {
        key: 'products',
        label: statLabels.products,
        value: stats.products,
        icon: statIcons.products,
      },
      {
        key: 'categories',
        label: statLabels.categories,
        value: stats.categories,
        icon: statIcons.categories,
      },
      {
        key: 'users',
        label: statLabels.users,
        value: stats.users,
        icon: statIcons.users,
      },
      {
        key: 'orders',
        label: statLabels.orders,
        value: stats.orders,
        icon: statIcons.orders,
      },
    ],
    [stats]
  );

  useEffect(() => {
    let alive = true;

    const loadDashboard = async () => {
      setLoading(true);

      const [
        productsResult,
        categoriesResult,
        usersResult,
        ordersResult,
        inventoryResult,
      ] = await Promise.allSettled([
        api.getProducts(),
        api.getCategories(),
        api.adminUsers(),
        api.orders(),
        api.inventoryDashboard(),
      ]);

      if (!alive) return;

      setStats({
        products:
          productsResult.status === 'fulfilled' ? getCount(productsResult.value) : 0,
        categories:
          categoriesResult.status === 'fulfilled' ? getCount(categoriesResult.value) : 0,
        users:
          usersResult.status === 'fulfilled' ? getCount(usersResult.value) : 0,
        orders:
          ordersResult.status === 'fulfilled' ? getCount(ordersResult.value) : 0,
      });

      if (inventoryResult.status === 'fulfilled') {
        setInventory(inventoryResult.value.data);
      }

      setLoading(false);
    };

    loadDashboard();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Dashboard</h2>
          <p className="text-muted mb-0">
            Resumen general del e-commerce, inventario y operaciones.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {cards.map((card) => (
          <div key={card.key} className="col-md-3">
            <div className="panel-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="text-muted mb-2">{card.label}</h6>
                  <h3 className="mb-0">{loading ? '...' : card.value}</h3>
                </div>
                <i className={`bi ${card.icon} fs-3 text-muted`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {inventory && (
        <div className="row g-3">
          <div className="col-md-4">
            <div className="panel-card p-3 h-100">
              <h6 className="text-muted mb-2">Valor inventario</h6>
              <h3 className="mb-0">
                ${Number(inventory.inventory_value_avg_cost_clp || 0).toLocaleString(
                  'es-CL'
                )}
              </h3>
              <small className="text-muted">Calculado con costo promedio.</small>
            </div>
          </div>

          <div className="col-md-4">
            <div className="panel-card p-3 h-100">
              <h6 className="text-muted mb-2">Sin stock</h6>
              <h3 className="mb-0">
                {(inventory.products_without_stock || []).length}
              </h3>
              <small className="text-muted">Productos agotados mostrados.</small>
            </div>
          </div>

          <div className="col-md-4">
            <div className="panel-card p-3 h-100">
              <h6 className="text-muted mb-2">Bajo mínimo</h6>
              <h3 className="mb-0">
                {(inventory.products_below_minimum_stock || []).length}
              </h3>
              <small className="text-muted">Productos bajo stock mínimo.</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}