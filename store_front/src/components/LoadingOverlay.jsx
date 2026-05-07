export default function LoadingOverlay({
  show = false,
  title = 'Procesando',
  message = 'Por favor espera...',
  steps = [],
  currentStep = 0,
  progress,
  blocking = false,
  onCancel,
}) {
  if (!show) return null;

  return (
    <div className={`loading-overlay ${blocking ? 'is-blocking' : ''}`} role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <h5 className="mb-2">{title}</h5>
        {message && <p className="text-muted mb-3">{message}</p>}

        {typeof progress === 'number' && (
          <div className="loading-progress mb-3">
            <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        )}

        {Array.isArray(steps) && steps.length > 0 && (
          <ul className="loading-steps">
            {steps.map((step, index) => {
              let state = 'pending';
              if (index < currentStep) state = 'done';
              if (index === currentStep) state = 'active';
              return (
                <li key={`${step}-${index}`} className={`loading-step ${state}`}>
                  {step}
                </li>
              );
            })}
          </ul>
        )}

        {typeof onCancel === 'function' && (
          <button type="button" className="btn btn-outline-light btn-sm mt-2" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
