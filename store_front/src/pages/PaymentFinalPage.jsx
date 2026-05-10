import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useCart } from '../hooks/useCart';
import { notyf } from '../api/notifier';
import { submitWebpayForm } from '../utils/webpay';
import { formatAmount, formatDate } from '../utils/format';

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
  const { fetchCart } = useCart();
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptNotAvailable, setReceiptNotAvailable] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const payment = useMemo(() => {
    if (location.state?.payment) return location.state.payment;
    return getStoredPaymentResult();
  }, [location.state]);

  const isApproved =
    payment?.status === 'AUTHORIZED' &&
    Number(payment?.response_code) === 0;

  useEffect(() => {
    if (isApproved) {
      fetchCart();
    }
  }, [isApproved, fetchCart]);

  const retryPayment = async () => {
    if (!payment?.order_id || retryingPayment) return;

    setRetryingPayment(true);
    try {
      const webpayTransaction = await api.createWebpayTransaction(payment.order_id);
      submitWebpayForm(webpayTransaction.url, webpayTransaction.token);
    } catch {
      // El apiClient ya muestra el error.
    } finally {
      setRetryingPayment(false);
    }
  };

  const loadReceipt = async () => {
    if (!payment?.order_id || receiptLoading) return;

    setShowReceipt(true);
    setReceiptLoading(true);
    setReceiptNotAvailable(false);

    try {
      const { data } = await api.getReceiptByOrder(payment.order_id);
      setReceipt(data);
    } catch (error) {
      if (error?.response?.status === 404) {
        setReceiptNotAvailable(true);
      }
      setReceipt(null);
    } finally {
      setReceiptLoading(false);
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

  const isCancelled = payment?.status === 'CANCELLED';
  const DOCUMENT_TYPE_LABELS = {
    internal_receipt: 'Comprobante interno',
    boleta: 'Boleta',
    factura: 'Factura',
  };

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
        <li><strong>Fecha:</strong> {formatDate(payment?.transaction_date)}</li>
      </ul>

      <div className="d-flex gap-2 flex-wrap">
        {isApproved ? (
          <>
            <Link className="btn btn-success" to="/mis-pedidos" replace>Ver mis pedidos</Link>
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={loadReceipt}
              disabled={receiptLoading}
            >
              {receiptLoading ? 'Cargando comprobante...' : 'Ver comprobante'}
            </button>
          </>
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

      {isApproved && showReceipt ? (
        <div className="mt-4 border rounded p-3">
          <h5 className="mb-3">Comprobante</h5>
          {receiptLoading ? (
            <p className="mb-0 text-muted">Cargando comprobante...</p>
          ) : receiptNotAvailable ? (
            <p className="mb-0 text-warning">
              El comprobante aún no está disponible. Intenta nuevamente en unos minutos.
            </p>
          ) : receipt ? (
            <ul className="list-unstyled mb-0">
              <li><strong>Número de documento:</strong> {receipt.document_number || '-'}</li>
              <li><strong>Neto:</strong> {formatAmount(receipt.net_amount_clp)}</li>
              <li><strong>IVA (19%):</strong> {formatAmount(receipt.tax_amount_clp)}</li>
              <li><strong>Total:</strong> {formatAmount(receipt.total_amount_clp)}</li>
              <li><strong>Tipo:</strong> {DOCUMENT_TYPE_LABELS[receipt.document_type] || receipt.document_type || '-'}</li>
              <li><strong>Fecha de emisión:</strong> {formatDate(receipt.issued_at)}</li>
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
