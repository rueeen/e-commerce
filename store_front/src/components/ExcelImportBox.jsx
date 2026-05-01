import { useState } from 'react';

export default function ExcelImportBox({ title, columns, buttonLabel, onImport, result, isImporting = false }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImport = () => {
    if (!selectedFile) {
      alert('Selecciona un archivo XLSX');
      return;
    }
    onImport(selectedFile);
  };

  return (
    <div className="card p-3 mb-4">
      <h5>{title}</h5>
      <p className="small mb-2">Columnas esperadas: {columns.join(', ')}</p>
      <div className="d-flex gap-2 mb-2">
        <input className="form-control" type="file" accept=".xlsx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn btn-primary" onClick={handleImport} disabled={isImporting || !selectedFile}>
          {isImporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Importando...
            </>
          ) : buttonLabel}
        </button>
      </div>
      {result ? (
        <div className="bg-light p-2 rounded small mb-0">
          <div><strong>Formato detectado:</strong> {result.detected_format || '-'}</div>
          <div><strong>Creados:</strong> {result.created ?? 0}</div>
          <div><strong>Actualizados:</strong> {result.updated ?? 0}</div>
          <div><strong>Errores:</strong> {(result.errors || []).length}</div>
          {(result.errors || []).length > 0 ? <pre className="mb-0 mt-2">{JSON.stringify(result.errors, null, 2)}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}
