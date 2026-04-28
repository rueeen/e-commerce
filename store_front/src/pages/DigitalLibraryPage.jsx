import { useEffect, useState } from 'react';
import { api } from '../api/endpoints';

export default function DigitalLibraryPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.digitalLibrary().then(({ data }) => setItems(data.results || data));
  }, []);

  return (
    <>
      <h2>Mis singles digitales</h2>
      <div className="row g-3">
        {items.map((item) => (
          <div key={item.id} className="col-md-4">
            <div className="card h-100">
              <div className="card-body">
                <h5>{item.name}</h5>
                <p className="text-muted">Comprado el {new Date(item.purchased_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
