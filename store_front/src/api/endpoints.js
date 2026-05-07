import apiClient from './client';

const appendFormData = (payload = {}) => {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });

  return formData;
};

const uploadConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

const extractPaginatedResults = (data) => data?.results || data || [];

export const api = {
  // =========================
  // Auth / Accounts
  // =========================
  register: (payload) => apiClient.post('/api/accounts/register/', payload),
  login: (payload) => apiClient.post('/api/accounts/login/', payload),
  me: () => apiClient.get('/api/accounts/me/'),

  adminUsers: (params = {}) => apiClient.get('/api/accounts/users/', { params }),
  adminUserById: (id) => apiClient.get(`/api/accounts/users/${id}/`),
  adminUpdateUser: (id, payload) => apiClient.patch(`/api/accounts/users/${id}/`, payload),
  adminUpdateUserRole: (id, role) =>
    apiClient.patch(`/api/accounts/users/${id}/role/`, { role }),
  adminUpdateUserStatus: (id, is_active) =>
    apiClient.patch(`/api/accounts/users/${id}/status/`, { is_active }),

  // =========================
  // Products / Catalog
  // =========================
  getProducts: (params = {}) => apiClient.get('/api/products/products/', { params }),
  fetchAllProducts: async (params = {}) => {
    let page = 1;
    let hasNext = true;
    let allProducts = [];

    while (hasNext) {
      const { data } = await apiClient.get('/api/products/products/', {
        params: { ...params, page },
      });
      const results = extractPaginatedResults(data);

      allProducts = [...allProducts, ...results];
      hasNext = Boolean(data?.next);
      page += 1;
    }

    return allProducts;
  },
  productById: (id) => apiClient.get(`/api/products/products/${id}/`),
  createProduct: (payload) => apiClient.post('/api/products/products/', payload),
  updateProduct: (id, payload) => apiClient.put(`/api/products/products/${id}/`, payload),
  patchProduct: (id, payload) => apiClient.patch(`/api/products/products/${id}/`, payload),
  deleteProduct: (id) => apiClient.delete(`/api/products/products/${id}/`),
  addBundleItem: (bundleId, payload) =>
    apiClient.post(`/api/products/products/${bundleId}/bundle-items/`, payload),
  removeBundleItem: (bundleId, itemId) =>
    apiClient.delete(`/api/products/products/${bundleId}/bundle-items/${itemId}/`),

  createSingleFromScryfall: (payload) =>
    apiClient.post('/api/products/products/create-single-from-scryfall/', payload),

  productKardex: (id) => apiClient.get(`/api/products/products/${id}/kardex/`),
  applySuggestedPrice: (id) =>
    apiClient.post(`/api/products/products/${id}/apply-suggested-price/`),
  recalculateProductPrices: (payload) =>
    apiClient.post('/api/products/products/recalculate-prices/', payload),
  productSuggestedPrice: (id, unit_cost_clp = 0) =>
    apiClient.get(`/api/products/products/${id}/suggested-price/`, {
      params: { unit_cost_clp },
    }),

  importCatalogXlsx: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post(
      '/api/products/products/import-catalog-xlsx/',
      formData,
      uploadConfig
    );
  },

  // =========================
  // Categories
  // =========================
  getCategories: (params = {}) => apiClient.get('/api/products/categories/', { params }),
  createCategory: (payload) => apiClient.post('/api/products/categories/', payload),
  updateCategory: (id, payload) =>
    apiClient.put(`/api/products/categories/${id}/`, payload),
  patchCategory: (id, payload) =>
    apiClient.patch(`/api/products/categories/${id}/`, payload),
  deleteCategory: (id) => apiClient.delete(`/api/products/categories/${id}/`),
  getProductTypes: (params = {}) => apiClient.get('/api/products/product-types/', { params }),
  createProductType: (payload) => apiClient.post('/api/products/product-types/', payload),
  patchProductType: (id, payload) => apiClient.patch(`/api/products/product-types/${id}/`, payload),

  // =========================
  // MTG Cards local cache
  // =========================
  searchMtgCards: (q) =>
    apiClient.get('/api/products/cards/', {
      params: { search: q },
    }),

  // =========================
  // Scryfall
  // =========================
  searchScryfallCards: (q) =>
    apiClient.get('/api/products/scryfall/search/', {
      params: { q },
    }),

  importScryfallCard: (scryfall_id) =>
    apiClient.post('/api/products/scryfall/import/', { scryfall_id }),

  // =========================
  // Pricing Settings
  // =========================
  listPricingSettings: () => apiClient.get('/api/products/pricing-settings/'),
  getActivePricingSettings: () => apiClient.get('/api/products/pricing-settings/active/'),
  createPricingSettings: (payload) =>
    apiClient.post('/api/products/pricing-settings/', payload),
  updatePricingSettings: (id, payload) =>
    apiClient.patch(`/api/products/pricing-settings/${id}/`, payload),

  // =========================
  // Kardex
  // =========================
  getKardex: (params = {}) => apiClient.get('/api/products/kardex/', { params }),
  createKardexMovement: (payload) =>
    apiClient.post('/api/products/kardex/movement/', payload),

  // =========================
  // Suppliers
  // =========================
  getSuppliers: (params = {}) => apiClient.get('/api/products/suppliers/', { params }),
  supplierById: (id) => apiClient.get(`/api/products/suppliers/${id}/`),
  createSupplier: (payload) => apiClient.post('/api/products/suppliers/', payload),
  updateSupplier: (id, payload) =>
    apiClient.put(`/api/products/suppliers/${id}/`, payload),
  patchSupplier: (id, payload) =>
    apiClient.patch(`/api/products/suppliers/${id}/`, payload),
  deleteSupplier: (id) => apiClient.delete(`/api/products/suppliers/${id}/`),

  // =========================
  // Purchase Orders
  // =========================
  getPurchaseOrders: (params = {}) =>
    apiClient.get('/api/products/purchase-orders/', { params }),

  getPurchaseOrderById: (id) =>
    apiClient.get(`/api/products/purchase-orders/${id}/`),

  createPurchaseOrder: (payload) =>
    apiClient.post('/api/products/purchase-orders/', payload),

  updatePurchaseOrder: (id, payload) =>
    apiClient.put(`/api/products/purchase-orders/${id}/`, payload),

  patchPurchaseOrder: (id, payload) =>
    apiClient.patch(`/api/products/purchase-orders/${id}/`, payload),

  deletePurchaseOrder: (id) =>
    apiClient.delete(`/api/products/purchase-orders/${id}/`),

  receivePurchaseOrder: (id) =>
    apiClient.post(`/api/products/purchase-orders/${id}/receive/`),

  recalculatePurchaseOrder: (id) =>
    apiClient.post(`/api/products/purchase-orders/${id}/recalculate/`),

  scryfallMatchPurchaseOrderItem: (purchaseOrderId, payload) =>
    apiClient.post(
      `/api/products/purchase-orders/${purchaseOrderId}/scryfall-match/`,
      payload
    ),

  createProductFromPurchaseOrderItem: (purchaseOrderId, itemId, payload = {}) =>
    apiClient.post(
      `/api/products/purchase-orders/${purchaseOrderId}/items/${itemId}/create-product/`,
      payload
    ),

  createMissingProductsFromPurchaseOrder: (purchaseOrderId, payload = {}) =>
    apiClient.post(
      `/api/products/purchase-orders/${purchaseOrderId}/create-missing-products/`,
      payload
    ),

  applySuggestedPricesToPurchaseOrder: (id) =>
    apiClient.post(`/api/products/purchase-orders/${id}/apply-suggested-prices/`),

  purchaseOrderImportPreview: (payload) =>
    apiClient.post(
      '/api/products/purchase-orders/import-preview/',
      appendFormData(payload),
      uploadConfig
    ),

  purchaseOrderImportCreate: (payload) =>
    apiClient.post(
      '/api/products/purchase-orders/import-create/',
      appendFormData(payload),
      uploadConfig
    ),

  purchaseOrderImport: (payload) =>
    apiClient.post(
      '/api/products/purchase-orders/import/',
      appendFormData(payload),
      uploadConfig
    ),

  purchaseOrderImportXlsx: (payload) =>
    apiClient.post(
      '/api/products/purchase-orders/import-xlsx/',
      appendFormData(payload),
      uploadConfig
    ),

  // =========================
  // Inventory Dashboard
  // =========================
  inventoryDashboard: () => apiClient.get('/api/products/inventory/dashboard/'),

  // =========================
  // Cart
  // =========================
  cart: () => apiClient.get('/api/cart/'),

  addToCart: (payload) => apiClient.post('/api/cart/items/', payload),

  updateCart: (itemId, payload) =>
    apiClient.patch(`/api/cart/items/${itemId}/`, payload),

  removeFromCart: (itemId) =>
    apiClient.delete(`/api/cart/items/${itemId}/remove/`),

  clearCart: () => apiClient.delete('/api/cart/clear/'),

  // =========================
  // Customer Orders
  // =========================
  orders: (params = {}) => apiClient.get('/api/orders/', { params }),
  orderById: (id) => apiClient.get(`/api/orders/${id}/`),

  createOrderFromCart: () => apiClient.post('/api/orders/from-cart/'),
  createManualOrder: (payload) => apiClient.post('/api/orders/manual/', payload),

  confirmOrderPayment: (id) =>
    apiClient.post(`/api/orders/${id}/confirm-payment/`),

  cancelOrder: (id) => apiClient.post(`/api/orders/${id}/cancel/`),

  createWebpayTransaction: (order_id) => apiClient.post('/api/payments/webpay/create/', { order_id }),
  commitWebpayTransaction: (tokenWs) => apiClient.post('/api/payments/webpay/commit/', { token_ws: tokenWs }),

  // =========================
  // Assisted Orders
  // =========================
  assistedOrders: (params = {}) =>
    apiClient.get('/api/orders/assisted/', { params }),

  assistedOrderById: (id) =>
    apiClient.get(`/api/orders/assisted/${id}/`),

  createAssistedOrder: (payload) =>
    apiClient.post('/api/orders/assisted/', payload),

  updateAssistedOrder: (id, payload) =>
    apiClient.patch(`/api/orders/assisted/${id}/`, payload),

  recalculateAssistedOrder: (id) =>
    apiClient.post(`/api/orders/assisted/${id}/recalculate/`),

  // =========================
  // Digital Library
  // =========================
  digitalLibrary: () => apiClient.get('/api/library/'),
};

export default api;
