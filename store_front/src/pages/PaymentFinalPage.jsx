import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/endpoints';
import { notyf } from '../api/notifier';
import { submitWebpayForm } from '../utils/webpay';

const formatAmount = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ?? '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
};

const getStoredPaymentResult = () => {
  const stored = sessionStorage.getItem('lastWebpayResult');
  sessionStorage.removeItem('lastWebpayResult');

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export default function PaymentFinalPage() {
  const location = useLocation();
  const [retryingPayment, setRetryingPayment] = useState(false);

  const payment = useMemo(() => {
    if (location.state?.payment) return location.state.payment;
    return getStoredPaymentResult();
  }, [location.state]);

  const retryPayment = async () => {
    if (!payment?.order_id || retryingPayment) return;

    setRetryingPayment(true);
    try {
      const webpayTransaction = await api.createWebpayTransaction(payment.order_id);
      notyf.success('Redirigiendo a Webpay...');
      submitWebpayForm(webpayTransaction.url, webpayTransaction.token);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setRetryingPayment(false);
    }
  };

  if (!payment) {
    return (
      <div className="panel-card p-4">
        <h2>Resultado del pago no disponible</h2>
        <p>No encontramos la información del pago. Intenta revisar tus pedidos o volver al carrito.</p>
        <div className="d-flex gap-2 flex-wrap">
          <Link className="btn btn-primary" to="/mis-pedidos" replace>Ver mis pedidos</Link>
          <Link className="btn btn-outline-primary" to="/carrito" replace>Volver al carrito</Link>
        </div>
      </div>
    );
  }

  const isApproved =
    payment?.status === 'AUTHORIZED' &&
    Number(payment?.response_code) === 0;

  const isCancelled = payment?.status === 'CANCELLED';

  return (
    <div className="panel-card p-4">
      <h2>{isApproved ? 'Pago aprobado' : 'Pago rechazado o no autorizado'}</h2>
      <p>
        {isApproved
          ? 'Tu compra fue procesada correctamente'
          : isCancelled
            ? 'Cancelaste el pago. Puedes volver a intentarlo cuando quieras.'
            : (payment?.detail || 'No fue posible procesar el pago.')}
      </p>

      <ul className="list-unstyled mb-4">
        <li><strong>Orden de compra:</strong> {payment?.buy_order || '-'}</li>
        <li><strong>Monto:</strong> {formatAmount(payment?.amount)}</li>
        <li><strong>Código de autorización:</strong> {payment?.authorization_code || '-'}</li>
        <li><strong>Tipo de pago:</strong> {payment?.payment_type_code || '-'}</li>
        {!!payment?.card_detail?.card_number && (
          <li><strong>Tarjeta (últimos 4):</strong> {payment.card_detail.card_number}</li>
        )}
        <li><strong>Fecha:</strong> {payment?.transaction_date || '-'}</li>
      </ul>

      <div className="d-flex gap-2 flex-wrap">
        {isApproved ? (
          <Link className="btn btn-success" to="/mis-pedidos" replace>Ver mis pedidos</Link>
        ) : (
          <>
            <Link className="btn btn-outline-primary" to="/carrito" replace>Volver al carrito</Link>
            {payment?.order_id ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={retryingPayment}
                onClick={retryPayment}
              >
                {retryingPayment ? 'Reintentando pago...' : 'Reintentar pago'}
              </button>
            ) : (
              <Link className="btn btn-primary" to="/carrito" replace>Reintentar pago</Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
