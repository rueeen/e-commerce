export default function EmptyState({
  title = 'Sin resultados',
  message = 'No hay datos disponibles.',
  icon = 'bi-inbox',
  children,
}) {
  return (
    <div className="panel-card p-4 text-center text-secondary">
      {icon && <i className={`bi ${icon} fs-1 d-block mb-2`} />}

      <h5 className="mb-2">{title}</h5>

      <p className="mb-0">{message}</p>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}