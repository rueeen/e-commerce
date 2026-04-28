import apiClient from './client';

export const api = {
  products: () => apiClient.get('/api/products/'),
  productById: (id) => apiClient.get(`/api/products/${id}/`),
  categories: () => apiClient.get('/api/categories/'),

  cart: () => apiClient.get('/api/cart/'),
  addToCart: (payload) => apiClient.post('/api/cart/add/', payload),
  updateCart: (payload) => apiClient.patch('/api/cart/update/', payload),
  removeFromCart: (payload) => apiClient.post('/api/cart/remove/', payload),
  clearCart: () => apiClient.post('/api/cart/clear/'),

  orders: () => apiClient.get('/api/orders/'),
  orderById: (id) => apiClient.get(`/api/orders/${id}/`),
  checkout: () => apiClient.post('/api/orders/checkout/'),

  digitalLibrary: () => apiClient.get('/api/digital-library/'),

  register: (payload) => apiClient.post('/api/auth/register/', payload),
  login: (payload) => apiClient.post('/api/auth/login/', payload),
  me: () => apiClient.get('/api/auth/me/'),

  adminCreateProduct: (payload) => apiClient.post('/api/products/', payload),
  adminEditProduct: (id, payload) => apiClient.put(`/api/products/${id}/`, payload),
  adminToggleProduct: (id, payload) => apiClient.patch(`/api/products/${id}/`, payload),
};
