import apiClient from './client';

export const api = {
  products: (params = {}) => apiClient.get('/api/products/', { params }),
  productById: (id) => apiClient.get(`/api/products/${id}/`),
  categories: () => apiClient.get('/api/categories/'),

  cart: () => apiClient.get('/api/cart/'),
  addToCart: (payload) => apiClient.post('/api/cart/add/', payload),
  updateCart: (itemId, payload) => apiClient.patch(`/api/cart/items/${itemId}/`, payload),
  removeFromCart: (itemId) => apiClient.delete(`/api/cart/items/${itemId}/remove/`),
  clearCart: () => apiClient.delete('/api/cart/clear/'),

  orders: () => apiClient.get('/api/orders/'),
  orderById: (id) => apiClient.get(`/api/orders/${id}/`),
  checkout: () => apiClient.post('/api/orders/checkout/'),

  digitalLibrary: () => apiClient.get('/api/library/'),

  register: (payload) => apiClient.post('/api/auth/register/', payload),
  login: (payload) => apiClient.post('/api/auth/login/', payload),
  me: () => apiClient.get('/api/auth/me/'),

  adminCreateProduct: (payload, asFormData = false) => apiClient.post('/api/products/', payload, asFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  adminEditProduct: (id, payload, asFormData = false) => apiClient.put(`/api/products/${id}/`, payload, asFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
  adminPatchProduct: (id, payload) => apiClient.patch(`/api/products/${id}/`, payload),
  adminDeleteProduct: (id) => apiClient.delete(`/api/products/${id}/`),

  importProductsExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/products/import-excel/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importTemplate: () => apiClient.get('/api/products/import-template/', { responseType: 'blob' }),
};
