import apiClient from './client';

export const api = {
  products: () => apiClient.get('/api/products/'),
  productById: (id) => apiClient.get(`/api/products/${id}/`),
  categories: () => apiClient.get('/api/categories/'),

  cart: () => apiClient.get('/api/cart/'),
  addToCart: (payload) => apiClient.post('/api/cart/items/', payload),
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

  adminCreateProduct: (payload) => apiClient.post('/api/products/', payload),
  adminEditProduct: (id, payload) => apiClient.put(`/api/products/${id}/`, payload),
  adminToggleProduct: (id, payload) => apiClient.patch(`/api/products/${id}/`, payload),
};
