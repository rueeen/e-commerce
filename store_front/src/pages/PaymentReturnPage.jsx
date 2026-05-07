import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/endpoints';

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const hasCommitted = useRef(false);
  const [state, setState] = useState({ loading: true, success: false, message: 'Confirmando pago...' });

  useEffect(() => {
    const run = async () => {
      const token = params.get('token_ws') || params.get('TBK_TOKEN');
      if (!token) {
        setState({ loading: false, success: false, message: 'No se recibió token de Webpay.' });
        return;
      }
      if (hasCommitted.current) return;
      hasCommitted.current = true;

      try {
        const response = await api.commitWebpayTransaction(token);
        const status = response?.status;
        const responseCode = response?.response_code;
        const success = status === 'AUTHORIZED' && responseCode === 0;
        const message = success
          ? 'Pago confirmado correctamente.'
          : (response?.detail || 'Pago rechazado o no autorizado.');

        setState({ loading: false, success, message });
      } catch (error) {
        const detail = error?.response?.data?.detail;
        setState({ loading: false, success: false, message: detail || 'Pago rechazado o no autorizado.' });
      }
    };
    run();
  }, [params]);

  return (
    <div className="panel-card p-4">
      <h2>Retorno de pago</h2>
      <p>{state.message}</p>
      {state.loading && <p>Confirmando pago...</p>}
      {!state.loading && state.success && <Link className="btn btn-success" to="/mis-pedidos" replace>Ver mis pedidos</Link>}
      {!state.loading && !state.success && <Link className="btn btn-outline-primary" to="/carrito" replace>Volver al carrito</Link>}
    </div>
  );
}
