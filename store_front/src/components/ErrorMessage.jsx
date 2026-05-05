export default function ErrorMessage({
  message = 'Ocurrió un error.',
  children,
  onRetry,
  retryLabel = 'Reintentar',
}) {
  const content = children || message;

  if (!content) return null;

  return (
    <div className="alert alert-danger" role="alert">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>{content}</div>

        {onRetry && (
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}