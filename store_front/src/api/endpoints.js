import apiClient from './client';
import axios from 'axios';

const SCRYFALL_API_BASE_URL = 'https://api.scryfall.com';

export const api = {
  getProducts: (params = {}) => apiClient.get('/api/products/', { params }),
  searchMtgCards: (q) => apiClient.get('/api/cards/', { params: { search: q } }),
  searchScryfallCards: (q) => axios.get(`${SCRYFALL_API_BASE_URL}/cards/search`, { params: { q } }),
  importScryfallCard: (scryfall_id) => apiClient.post('/api/mtg/cards/import/', { scryfall_id }),
  createSingleFromScryfall: (payload) => apiClient.post('/api/products/create-single-from-scryfall/', payload, { headers: { 'Content-Type': 'application/json' } }),
  productById: (id) => apiClient.get(`/api/products/${id}/`),
  createProduct: (payload) => apiClient.post('/api/products/', payload),
  updateProduct: (id, payload) => apiClient.put(`/api/products/${id}/`, payload),
  patchProduct: (id, payload) => apiClient.patch(`/api/products/${id}/`, payload),
  deleteProduct: (id) => apiClient.delete(`/api/products/${id}/`),
  importProductsExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/products/import-excel/', formData);
  },

  getCategories: (params = {}) => apiClient.get('/api/categories/', { params }),
  createCategory: (payload) => apiClient.post('/api/categories/', payload),
  updateCategory: (id, payload) => apiClient.put(`/api/categories/${id}/`, payload),
  patchCategory: (id, payload) => apiClient.patch(`/api/categories/${id}/`, payload),
  listPricingSettings: () => apiClient.get('/api/pricing-settings/'),
  getActivePricingSettings: () => apiClient.get('/api/pricing-settings/active/'),
  updatePricingSettings: (id, payload) => apiClient.patch(`/api/pricing-settings/${id}/`, payload),
  createPricingSettings: (payload) => apiClient.post('/api/pricing-settings/', payload),

  orders: (params = {}) => apiClient.get('/api/orders/', { params }),
  orderById: (id) => apiClient.get(`/api/orders/${id}/`),
  updateOrderStatus: (id, status) => apiClient.patch(`/api/orders/${id}/status/`, { status }),

  adminUsers: () => apiClient.get('/api/auth/users/'),
  adminUpdateUser: (id, payload) => apiClient.patch(`/api/auth/users/${id}/`, payload),
  adminUpdateUserRole: (id, role) => apiClient.patch(`/api/auth/users/${id}/role/`, { role }),
  adminUpdateUserStatus: (id, is_active) => apiClient.patch(`/api/auth/users/${id}/status/`, { is_active }),

  cart: () => apiClient.get('/api/cart/'),
  addToCart: (payload) => apiClient.post('/api/cart/add/', payload),
  updateCart: (itemId, payload) => apiClient.patch(`/api/cart/items/${itemId}/`, payload),
  removeFromCart: (itemId) => apiClient.delete(`/api/cart/items/${itemId}/remove/`),
  clearCart: () => apiClient.delete('/api/cart/clear/'),
  checkout: () => apiClient.post('/api/orders/checkout/'),
  digitalLibrary: () => apiClient.get('/api/library/'),
  register: (payload) => apiClient.post('/api/auth/register/', payload),
  login: (payload) => apiClient.post('/api/auth/login/', payload),
  me: () => apiClient.get('/api/auth/me/'),
};
