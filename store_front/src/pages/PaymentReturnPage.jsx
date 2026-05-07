import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../api/endpoints';

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasCommitted = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasCommitted.current) return;
      hasCommitted.current = true;

      const tokenWs = params.get('token_ws');
      const tbkToken = params.get('TBK_TOKEN');
      const tbkOrderCode = params.get('TBK_ORDER_CODE');

      if (!tokenWs && (tbkToken || tbkOrderCode)) {
        const cancelResult = {
          status: 'CANCELLED',
          response_code: -1,
          detail: 'Pago cancelado por el usuario.',
        };
        sessionStorage.setItem('lastWebpayResult', JSON.stringify(cancelResult));
        navigate('/pago/final', {
          replace: true,
          state: {
            payment: cancelResult,
          },
        });
        return;
      }

      if (!tokenWs) {
        navigate('/carrito', { replace: true });
        return;
      }

      try {
        const data = await api.commitWebpayTransaction(tokenWs);
        sessionStorage.setItem('lastWebpayResult', JSON.stringify(data));
        navigate('/pago/final', {
          replace: true,
          state: {
            payment: data,
          },
        });
      } catch (error) {
        const errorData = error?.response?.data;
        const paymentError = {
          status: errorData?.status || 'FAILED',
          response_code: errorData?.response_code ?? -1,
          detail: errorData?.detail || 'Pago rechazado o no autorizado.',
        };
        sessionStorage.setItem('lastWebpayResult', JSON.stringify(paymentError));
        navigate('/pago/final', {
          replace: true,
          state: {
            payment: paymentError,
          },
        });
      }
    };

    run();
  }, [navigate, params]);

  return (
    <div className="panel-card p-4 text-center">
      <h2>Retorno de pago</h2>
      <div className="d-flex flex-column align-items-center gap-2 mt-3" role="status" aria-live="polite">
        <div className="spinner-border" aria-hidden="true" />
        <span>Confirmando pago...</span>
      </div>
    </div>
  );
}
