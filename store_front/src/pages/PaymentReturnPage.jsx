import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../api/endpoints';

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasCommitted = useRef(false);

  useEffect(() => {
    const run = async () => {
      const tokenWs = params.get('token_ws') || params.get('TBK_TOKEN');
      if (!tokenWs || hasCommitted.current) return;
      hasCommitted.current = true;

      try {
        const data = await api.commitWebpayTransaction(tokenWs);
        navigate('/pago/final', {
          replace: true,
          state: {
            payment: data,
          },
        });
      } catch (error) {
        const errorData = error?.response?.data;
        navigate('/pago/final', {
          replace: true,
          state: {
            payment: {
              status: errorData?.status || 'FAILED',
              response_code: errorData?.response_code,
              detail: errorData?.detail || 'Pago rechazado o no autorizado.',
            },
          },
        });
      }
    };

    run();
  }, [navigate, params]);

  return (
    <div className="panel-card p-4">
      <h2>Retorno de pago</h2>
      <p>Confirmando pago...</p>
    </div>
  );
}
