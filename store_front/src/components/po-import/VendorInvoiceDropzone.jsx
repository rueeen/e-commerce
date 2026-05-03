import { useRef, useState } from 'react';

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VendorInvoiceDropzone({ onFile, accept = '.xlsx', label = 'Archivo XLSX de proveedor' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    if (!isXlsx) return;
    setSelectedFile(file);
    onFile?.(file);
  };

  return (
    <div className="po-dropzone-wrap">
      <label className="po-label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="po-hidden-input"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div
        className={`po-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
      >
        {!selectedFile ? <p>Arrastra y suelta el archivo .xlsx aquí o haz click para seleccionar.</p> : (
          <div>
            <strong>{selectedFile.name}</strong>
            <p>{formatSize(selectedFile.size)}</p>
          </div>
        )}
      </div>
      {selectedFile ? (
        <button type="button" className="po-btn po-btn-light" onClick={() => inputRef.current?.click()}>
          Cambiar archivo
        </button>
      ) : null}
    </div>
  );
}
