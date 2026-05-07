import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../api/endpoints';

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, success: false, message: 'Confirmando pago...' });

  useEffect(() => {
    const run = async () => {
      const token = params.get('token_ws') || params.get('TBK_TOKEN');
      if (!token) {
        setState({ loading: false, success: false, message: 'No se recibió token de Webpay.' });
        return;
      }
      try {
        await api.commitWebpayTransaction(token);
        setState({ loading: false, success: true, message: 'Pago confirmado correctamente.' });
      } catch {
        setState({ loading: false, success: false, message: 'Pago rechazado o no autorizado.' });
      }
    };
    run();
  }, [params]);

  return (
    <div className="panel-card p-4">
      <h2>Retorno de pago</h2>
      <p>{state.message}</p>
      {state.loading && <p>Confirmando pago...</p>}
      {!state.loading && state.success && <Link className="btn btn-success" to="/mis-pedidos">Ver mis pedidos</Link>}
      {!state.loading && !state.success && <Link className="btn btn-outline-primary" to="/carrito">Volver al carrito</Link>}
    </div>
  );
}
