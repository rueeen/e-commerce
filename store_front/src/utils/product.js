export const getProductTypeValue = (product) =>
  product?.product_type_slug ||
  product?.product_type?.slug ||
  product?.product_type_data?.slug ||
  product?.product_type_detail?.slug ||
  product?.product_type ||
  'other'

export const getProductTypeLabel = (type) => {
  const labels = {
    single: 'Carta individual',
    sealed: 'Producto sellado',
    bundle: 'Bundle',
    accessory: 'Accesorio',
    service: 'Servicio / encargo',
    other: 'Otro',
  }
  return labels[type] || type
}
