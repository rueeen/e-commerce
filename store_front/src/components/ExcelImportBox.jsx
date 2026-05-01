import { useState } from 'react';

export default function ExcelImportBox({ title, columns, buttonLabel, onImport, result }) {
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
        <button type="button" className="btn btn-primary" onClick={handleImport} disabled={!selectedFile}>{buttonLabel}</button>
      </div>
      {result ? <pre className="bg-light p-2 rounded small mb-0">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}
