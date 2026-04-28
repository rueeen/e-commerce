import apiClient from './client';

export const api = {
  getProducts: (params = {}) => apiClient.get('/api/products/', { params }),
  createProduct: (payload) => apiClient.post('/api/products/', payload),
  updateProduct: (id, payload) => apiClient.put(`/api/products/${id}/`, payload),
  patchProduct: (id, payload) => apiClient.patch(`/api/products/${id}/`, payload),
  deleteProduct: (id) => apiClient.delete(`/api/products/${id}/`),
  importProductsExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/products/import-excel/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getCategories: () => apiClient.get('/api/categories/'),

  productById: (id) => apiClient.get(`/api/products/${id}/`),
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
};
