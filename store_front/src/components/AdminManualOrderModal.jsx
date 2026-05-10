import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import ProductAutocomplete from './ProductAutocomplete';
import { formatMoney } from '../utils/format';

const normalizeList = (data) => data?.results || data || [];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getProductPrice = (product) =>
  Number(product?.computed_price_clp || product?.price_clp || 0);

export default function AdminManualOrderModal({ show, onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [shippingClp, setShippingClp] = useState(0);
  const [discountClp, setDiscountClp] = useState(0);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;

    const loadData = async () => {
      try {
        const [usersRes, productsRes] = await Promise.all([
          api.adminUsers({ search: userQuery }),
          api.fetchAllProducts({ is_active: true }),
        ]);

        const nonSingleProducts = normalizeList(productsRes).filter(
          (product) => product.product_type !== 'single'
        );

        setUsers(normalizeList(usersRes.data));
        setProducts(nonSingleProducts);
      } catch {
        // apiClient ya maneja errores.
      }
    };

    loadData();
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const { data } = await api.adminUsers({ search: userQuery });
        setUsers(normalizeList(data));
      } catch {
        // apiClient ya maneja errores.
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [userQuery, show]);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unit_price_clp, 0),
    [items]
  );

  const total = Math.max(subtotal + toNumber(shippingClp) - toNumber(discountClp), 0);

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        key: `${Date.now()}-${Math.random()}`,
        product: null,
        quantity: 1,
        unit_price_clp: 0,
      },
    ]);
  };

  const updateItem = (key, patch) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (key) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserQuery('');
    setShippingClp(0);
    setDiscountClp(0);
    setItems([]);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose?.();
  };

  const handleCreate = async () => {
    if (!selectedUser?.id) {
      notyf.error('Debes seleccionar un cliente.');
      return;
    }

    if (!items.length) {
      notyf.error('Debes agregar al menos un ítem.');
      return;
    }

    for (const item of items) {
      if (!item.product?.id) {
        notyf.error('Todos los ítems deben tener un producto seleccionado.');
        return;
      }

      if (item.quantity <= 0) {
        notyf.error('La cantidad debe ser mayor a 0.');
        return;
      }

      if (item.unit_price_clp <= 0) {
        notyf.error('El precio unitario debe ser mayor a 0.');
        return;
      }
    }

    const payload = {
      user_id: selectedUser.id,
      shipping_clp: toNumber(shippingClp),
      discount_clp: toNumber(discountClp),
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: toNumber(item.quantity, 1),
        unit_price_clp: toNumber(item.unit_price_clp, 0),
      })),
    };

    setSaving(true);

    try {
      const { data } = await api.createManualOrder(payload);
      notyf.success(`Orden manual #${data.id} creada correctamente.`);
      handleClose();
      onCreated?.();
    } catch {
      // apiClient ya maneja errores.
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div className="modal-content bg-dark text-white border-secondary">
            <div className="modal-header border-secondary">
              <h5 className="modal-title">Nueva orden manual</h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose} />
            </div>

            <div className="modal-body">
              <div className="row g-2 mb-3">
                <div className="col-md-8">
                  <label className="form-label">Buscar usuario</label>
                  <input
                    className="form-control"
                    placeholder="Buscar por username o email"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <div className="list-group mt-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={`list-group-item list-group-item-action ${
                          selectedUser?.id === user.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        {user.username} · {user.email}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Envío CLP</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={shippingClp}
                    onChange={(event) => setShippingClp(toNumber(event.target.value, 0))}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">Descuento CLP</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={discountClp}
                    onChange={(event) => setDiscountClp(toNumber(event.target.value, 0))}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Ítems</h6>
                <button type="button" className="btn btn-sm btn-outline-light" onClick={addItem}>
                  Agregar ítem
                </button>
              </div>

              {items.length === 0 && <p className="text-muted">Aún no agregas productos.</p>}

              {items.map((item) => (
                <div className="panel-card p-2 mb-2" key={item.key}>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-6">
                      <label className="form-label">Producto</label>
                      <ProductAutocomplete
                        products={products}
                        placeholder="Buscar producto no-single..."
                        selectedLabel={item.product?.name || ''}
                        onSelect={(product) =>
                          updateItem(item.key, {
                            product,
                            unit_price_clp: getProductPrice(product),
                          })
                        }
                        onClear={() => updateItem(item.key, { product: null, unit_price_clp: 0 })}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.key, {
                            quantity: Math.max(1, toNumber(event.target.value, 1)),
                          })
                        }
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Precio unitario CLP</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={item.unit_price_clp}
                        onChange={(event) =>
                          updateItem(item.key, {
                            unit_price_clp: Math.max(1, toNumber(event.target.value, 1)),
                          })
                        }
                      />
                    </div>

                    <div className="col-md-1 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeItem(item.key)}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Subtotal</span>
                  <strong>{formatMoney(subtotal)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Envío</span>
                  <strong>{formatMoney(shippingClp)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Descuento</span>
                  <strong>- {formatMoney(discountClp)}</strong>
                </div>
                <hr className="border-secondary" />
                <div className="d-flex justify-content-between">
                  <span>Total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer border-secondary">
              <button type="button" className="btn btn-outline-light" onClick={handleClose}>
                Cancelar
              </button>
              <button type="button" className="btn btn-success" disabled={saving} onClick={handleCreate}>
                {saving ? 'Creando...' : 'Crear orden'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
