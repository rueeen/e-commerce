export default function ErrorMessage({ message = "Ocurrió un error" }) { return <div className="alert alert-danger">{message}</div>; }
