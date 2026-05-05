import { useState } from 'react';

export default function ConfirmModal({
  id = 'confirmModal',
  title = 'Confirmar acción',
  text = '¿Seguro que deseas continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!onConfirm) return;

    setLoading(true);

    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id={id}
      tabIndex="-1"
      aria-labelledby={`${id}Label`}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark text-white border-secondary">
          <div className="modal-header border-secondary">
            <h5 className="modal-title" id={`${id}Label`}>
              {title}
            </h5>

            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Cerrar"
              disabled={loading}
            />
          </div>

          <div className="modal-body">
            {text}
          </div>

          <div className="modal-footer border-secondary">
            <button
              type="button"
              className="btn btn-outline-light"
              data-bs-dismiss="modal"
              disabled={loading}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className={`btn btn-${confirmVariant}`}
              onClick={handleConfirm}
              data-bs-dismiss="modal"
              disabled={loading}
            >
              {loading ? 'Procesando...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}