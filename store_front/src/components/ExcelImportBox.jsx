import { useState } from 'react';

export default function ExcelImportBox({ onImport, result }) {
  const [file, setFile] = useState(null);

  return (
    <div className="card p-3 mb-4">
      <h5>Importación masiva (Excel)</h5>
      <p className="small mb-2">Plantilla Singles: name, condition, qty, price_usd, total_usd, foil. Plantilla mixta (single/sealed/bundle): name, type, qty, price_usd. Opcionales: category, set, collector_number, description, image, notes.</p>
      <div className="d-flex gap-2 mb-2">
        <input className="form-control" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn btn-primary" onClick={() => onImport(file)} disabled={!file}>Importar productos</button>
      </div>
      {result ? <pre className="bg-light p-2 rounded small mb-0">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>
  );
}
