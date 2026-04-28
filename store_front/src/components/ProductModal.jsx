export default function ProductModal({ product }) {
  return (
    <div className="modal fade" id="productModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Detalle de producto</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" />
          </div>
          <div className="modal-body">
            {product ? (
              <>
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <p className="fw-bold">${product.price}</p>
              </>
            ) : (
              <p>Sin información.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
