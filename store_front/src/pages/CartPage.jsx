import { useEffect, useState } from 'react'
import { REGIONES_COMUNAS, getComunasByRegion } from '../data/chile_regiones_comunas'
import { api } from '../api/endpoints'
import CartItem from '../components/CartItem'
import ConfirmModal from '../components/ConfirmModal'
import { notyf } from '../api/notifier'
import { submitWebpayForm } from '../utils/webpay'
import { useCart } from '../hooks/useCart'
import { formatMoney } from '../utils/format'

export default function CartPage() {
  const { items, total, updateItem, removeItem, clear, fetchCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false)
  const [shippingQuote, setShippingQuote] = useState(null)
  const [quotingShipping, setQuotingShipping] = useState(false)
  const [shippingData, setShippingData] = useState({
    recipient_name: '',
    recipient_phone: '',
    shipping_street: '',
    shipping_number: '',
    shipping_commune: '',
    shipping_region: '',
    shipping_notes: '',
  })

  const comunasDisponibles = getComunasByRegion(shippingData.shipping_region)

  useEffect(() => {
    const commune = shippingData.shipping_commune
    if (!commune) {
      setShippingQuote(null)
      return
    }

    let cancelled = false
    setQuotingShipping(true)
    setShippingQuote(null)

    api.getShippingQuote(commune)
      .then(({ data }) => {
        if (!cancelled) setShippingQuote(data)
      })
      .catch(() => {
        if (!cancelled) setShippingQuote(null)
      })
      .finally(() => {
        if (!cancelled) setQuotingShipping(false)
      })

    return () => {
      cancelled = true
    }
  }, [shippingData.shipping_commune])

  const handleShippingChange = (event) => {
    const { name, value } = event.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
  };

  const validateShipping = () => {
    if (!shippingData.recipient_name.trim()) {
      notyf.error('El nombre del destinatario es obligatorio.');
      return false;
    }
    if (!shippingData.shipping_street.trim()) {
      notyf.error('La calle es obligatoria.');
      return false;
    }
    if (!shippingData.shipping_commune.trim()) {
      notyf.error('La comuna es obligatoria.');
      return false;
    }
    if (!shippingData.shipping_region.trim()) {
      notyf.error('La región es obligatoria.');
      return false;
    }

    return true;
  };

  const createOrder = async () => {
    if (!items.length) {
      notyf.error('Tu carrito está vacío.');
      return;
    }
    if (!validateShipping()) return;

    setCheckingOut(true);

    try {
      const { data } = await api.createOrderFromCart(shippingData);
      const payment = await api.createWebpayTransaction(data.id);
      submitWebpayForm(payment.url, payment.token);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <div className="mb-3">
        <h2 className="mb-1">Carrito</h2>
        <p className="text-muted mb-0">
          Completa tu dirección y revisa tu pedido antes de pagar.
        </p>
      </div>

      <div className="row g-4 align-items-start">

        {/* ── Columna izquierda: formulario + tabla ── */}
        <div className="col-lg-8">

          {/* Dirección de despacho */}
          <div className="panel-card p-3 mb-3">
            <h5 className="mb-3">Dirección de despacho</h5>
            <div className="row g-3">

              <div className="col-md-6">
                <label className="form-label">
                  Nombre destinatario <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  name="recipient_name"
                  required
                  value={shippingData.recipient_name}
                  onChange={handleShippingChange}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Teléfono destinatario</label>
                <input
                  className="form-control"
                  name="recipient_phone"
                  value={shippingData.recipient_phone}
                  onChange={handleShippingChange}
                />
              </div>

              <div className="col-md-8">
                <label className="form-label">
                  Calle <span className="text-danger">*</span>
                </label>
                <input
                  className="form-control"
                  name="shipping_street"
                  required
                  value={shippingData.shipping_street}
                  onChange={handleShippingChange}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Número</label>
                <input
                  className="form-control"
                  name="shipping_number"
                  value={shippingData.shipping_number}
                  onChange={handleShippingChange}
                />
              </div>

              {/* Región PRIMERO, luego Comuna dependiente */}
              <div className="col-md-6">
                <label className="form-label">
                  Región <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="shipping_region"
                  required
                  value={shippingData.shipping_region}
                  onChange={(e) =>
                    setShippingData((prev) => ({
                      ...prev,
                      shipping_region: e.target.value,
                      shipping_commune: '',
                    }))
                  }
                >
                  <option value="">Selecciona una región</option>
                  {REGIONES_COMUNAS.map((r) => (
                    <option key={r.nombre} value={r.nombre}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  Comuna <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  name="shipping_commune"
                  required
                  value={shippingData.shipping_commune}
                  onChange={handleShippingChange}
                  disabled={!shippingData.shipping_region}
                >
                  <option value="">
                    {shippingData.shipping_region
                      ? 'Selecciona una comuna'
                      : 'Primero selecciona una región'}
                  </option>
                  {comunasDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Notas de entrega</label>
                <textarea
                  className="form-control"
                  rows="2"
                  name="shipping_notes"
                  placeholder="Instrucciones adicionales para el despacho (opcional)"
                  value={shippingData.shipping_notes}
                  onChange={handleShippingChange}
                />
              </div>

            </div>
          </div>

          {/* Tabla de productos */}
          <div className="panel-card p-3">
            <h5 className="mb-3">Productos</h5>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        Tu carrito está vacío.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <CartItem
                      key={item.id || item.product}
                      item={item}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ── Columna derecha: resumen del pedido (sticky) ── */}
        <div className="col-lg-4">
          <div className="panel-card p-3" style={{ position: 'sticky', top: '1rem' }}>
            <h5 className="mb-3">Resumen del pedido</h5>

            {/* Items del resumen */}
            <div className="mb-3">
              {items.map((item) => {
                const name = item.product_name || item.product_data?.name || `Producto #${item.product}`
                const price = item.unit_price_clp || item.price_clp || 0
                const qty = item.quantity || 1
                return (
                  <div key={item.id || item.product} className="d-flex justify-content-between small mb-1">
                    <span className="text-muted me-2" style={{ maxWidth: '70%' }}>
                      {name}
                      {qty > 1 && <span className="ms-1 badge bg-secondary">{qty}x</span>}
                    </span>
                    <span>{formatMoney(price * qty)}</span>
                  </div>
                )
              })}
            </div>

            <hr className="my-2" />

            {/* Subtotal */}
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Subtotal</span>
              <span className="small">{formatMoney(total)}</span>
            </div>

            {/* Envío */}
            {quotingShipping && (
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Envío</span>
                <span>Calculando...</span>
              </div>
            )}

            {!quotingShipping && shippingQuote && (
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-muted">
                  Envío · {shippingQuote.service_name}
                  {shippingQuote.delivery_days
                    ? ` · ${shippingQuote.delivery_days}`
                    : ''}
                </span>
                <span>{formatMoney(shippingQuote.amount)}</span>
              </div>
            )}

            {!quotingShipping && !shippingQuote && shippingData.shipping_commune && (
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Envío</span>
                <span>A coordinar</span>
              </div>
            )}

            {!shippingData.shipping_commune && (
              <div className="text-muted small mb-1">
                <span>Selecciona tu comuna para ver el costo de envío</span>
              </div>
            )}

            <hr className="my-2" />

            {/* Total */}
            <div className="d-flex justify-content-between fw-bold mb-3">
              <span>Total estimado</span>
              <span>{formatMoney(total + (shippingQuote?.amount || 0))}</span>
            </div>

            {shippingQuote && (
              <p className="text-muted" style={{ fontSize: '11px' }}>
                * El costo de envío es referencial y puede variar según el peso real del paquete.
              </p>
            )}

            {/* Botones */}
            <div className="d-grid gap-2">
              <button
                type="button"
                className="btn btn-success"
                disabled={checkingOut || !items.length}
                onClick={createOrder}
              >
                {checkingOut ? 'Iniciando pago...' : 'Pagar con Webpay'}
              </button>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                data-bs-toggle="modal"
                data-bs-target="#clearCartModal"
                disabled={!items.length || checkingOut}
              >
                Vaciar carrito
              </button>
            </div>

          </div>
        </div>

      </div>

      <ConfirmModal
        id="clearCartModal"
        title="Vaciar carrito"
        text="¿Seguro que deseas eliminar todos los productos?"
        onConfirm={clear}
      />
    </>
  );
}
