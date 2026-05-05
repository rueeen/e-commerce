export default function AlertMessage({
  type = 'info',
  message,
  children,
  className = '',
}) {
  const content = children || message;

  if (!content) return null;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      {content}
    </div>
  );
}