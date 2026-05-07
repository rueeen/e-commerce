import { Link, useLocation } from 'react-router-dom';

const formatAmount = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ?? '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function PaymentFinalPage() {
  const location = useLocation();
  const payment = location.state?.payment;

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

  return (
    <div className="panel-card p-4">
      <h2>{isApproved ? 'Pago aprobado' : 'Pago rechazado o no autorizado'}</h2>
      <p>
        {isApproved
          ? 'Tu compra fue procesada correctamente'
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
        {!isApproved && (
          <>
            <li><strong>response_code:</strong> {String(payment?.response_code ?? '-')}</li>
            <li><strong>status:</strong> {payment?.status || '-'}</li>
          </>
        )}
      </ul>

      <div className="d-flex gap-2 flex-wrap">
        {isApproved ? (
          <Link className="btn btn-success" to="/mis-pedidos" replace>Ver mis pedidos</Link>
        ) : (
          <>
            <Link className="btn btn-outline-primary" to="/carrito" replace>Volver al carrito</Link>
            <Link className="btn btn-primary" to="/carrito" replace>Reintentar pago</Link>
          </>
        )}
      </div>
    </div>
  );
}
