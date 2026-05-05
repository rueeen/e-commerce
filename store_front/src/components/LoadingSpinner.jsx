export default function LoadingSpinner({
  text = 'Cargando...',
  size = 'normal',
}) {
  const spinnerClass =
    size === 'sm'
      ? 'spinner-border spinner-border-sm text-primary'
      : 'spinner-border text-primary';

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center py-5 text-muted"
      role="status"
      aria-live="polite"
    >
      <div className={spinnerClass} aria-hidden="true" />

      {text && <span className="mt-2">{text}</span>}
    </div>
  );
}