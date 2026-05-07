export default function LoadingButton({
  loading = false,
  children,
  loadingText = 'Procesando...',
  disabled = false,
  className = 'btn btn-primary',
  type = 'button',
  onClick,
}) {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="loading-button-spinner" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
