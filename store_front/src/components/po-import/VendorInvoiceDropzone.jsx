import { useRef, useState } from 'react';
import { notyf } from '../../api/notifier';

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VendorInvoiceDropzone({
  onFile,
  accept = '.xlsx',
  label = 'Archivo XLSX de proveedor',
}) {
  const inputRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    onFile?.(null);
  };

  const handleFile = (file) => {
    if (!file) return;

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

    if (!isXlsx) {
      notyf.error('Debes seleccionar un archivo .xlsx válido.');
      return;
    }

    setSelectedFile(file);
    onFile?.(file);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className="po-dropzone-wrap">
      <label className="po-label">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="po-hidden-input"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div
        className={`po-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={openFilePicker}
      >
        {!selectedFile ? (
          <p className="mb-0">
            Arrastra y suelta el archivo .xlsx aquí o haz clic para seleccionar.
          </p>
        ) : (
          <div>
            <strong>{selectedFile.name}</strong>
            <p className="mb-0 text-muted">{formatSize(selectedFile.size)}</p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="po-actions">
          <button
            type="button"
            className="po-btn po-btn-light"
            onClick={openFilePicker}
          >
            Cambiar archivo
          </button>

          <button
            type="button"
            className="po-btn po-btn-light"
            onClick={clearFile}
          >
            Quitar archivo
          </button>
        </div>
      )}
    </div>
  );
}