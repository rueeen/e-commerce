import { useRef, useState } from 'react';
import { notyf } from '../api/notifier';

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ExcelImportBox({
  title = 'Importar Excel',
  columns = [],
  buttonLabel = 'Importar XLSX',
  onImport,
  result,
  isImporting = false,
}) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (file) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      notyf.error('Selecciona un archivo .xlsx válido.');
      setSelectedFile(null);

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      return;
    }

    setSelectedFile(file);
  };

  const handleImport = async () => {
    await onImport?.(selectedFile);
  };

  const clearFile = () => {
    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="panel-card p-3 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h5 className="mb-1">{title}</h5>

          {columns.length > 0 && (
            <p className="small text-muted mb-0">
              Columnas esperadas: {columns.join(', ')}
            </p>
          )}
        </div>

        {selectedFile && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={clearFile}
            disabled={isImporting}
          >
            Quitar archivo
          </button>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          ref={inputRef}
          className="form-control"
          type="file"
          accept=".xlsx"
          onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
          disabled={isImporting}
        />

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleImport}
          disabled={isImporting || !selectedFile}
        >
          {isImporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Importando...
            </>
          ) : (
            buttonLabel
          )}
        </button>
      </div>

      {selectedFile && (
        <div className="small text-muted mb-3">
          Archivo seleccionado:{' '}
          <strong>{selectedFile.name}</strong> ({formatSize(selectedFile.size)})
        </div>
      )}

      {result && (
        <div className="panel-card p-3 small mb-0">
          <div>
            <strong>Formato detectado:</strong> {result.detected_format || '-'}
          </div>

          <div>
            <strong>Creados:</strong> {result.created ?? 0}
          </div>

          <div>
            <strong>Actualizados:</strong> {result.updated ?? 0}
          </div>

          <div>
            <strong>Errores:</strong> {(result.errors || []).length}
          </div>

          {(result.warnings || []).length > 0 && (
            <details className="mt-2">
              <summary>Advertencias ({result.warnings.length})</summary>
              <pre className="mb-0 mt-2">
                {JSON.stringify(result.warnings, null, 2)}
              </pre>
            </details>
          )}

          {(result.errors || []).length > 0 && (
            <details className="mt-2">
              <summary>Errores ({result.errors.length})</summary>
              <pre className="mb-0 mt-2">
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}