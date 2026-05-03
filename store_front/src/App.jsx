import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import CustomerRoute from './components/CustomerRoute';
import ProtectedRoute from './components/ProtectedRoute';
import WorkerRoute from './components/WorkerRoute';
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ScryfallSingleCreate from './pages/ScryfallSingleCreate';
import PricingSettingsPage from './pages/PricingSettingsPage';
import AdminKardexPage from './pages/AdminKardexPage';
import AdminSuppliersPage from './pages/AdminSuppliersPage';
import AdminPurchaseOrdersPage from './pages/AdminPurchaseOrdersPage';
import ImportarOrdenPage from './pages/ImportarOrdenPage';

export default function App() {
  return <Routes>
    <Route element={<MainLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/catalog" element={<Navigate to="/catalogo" replace />} />
      <Route path="/productos/:id" element={<ProductDetailPage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/mis-pedidos" element={<CustomerRoute><OrdersPage /></CustomerRoute>} />
      <Route path="/mi-cuenta" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
    </Route>

    <Route path="/admin" element={<WorkerRoute><AdminLayout /></WorkerRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="productos" element={<AdminProductsPage />} />
      <Route path="categorias" element={<AdminCategoriesPage />} />
      <Route path="pedidos" element={<AdminOrdersPage />} />
      <Route path="importar-excel" element={<AdminProductsPage />} />
      <Route path="usuarios" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="scryfall-single" element={<AdminRoute><ScryfallSingleCreate /></AdminRoute>} />
      <Route path="pricing-settings" element={<AdminRoute><PricingSettingsPage /></AdminRoute>} />
      <Route path="kardex" element={<WorkerRoute><AdminKardexPage /></WorkerRoute>} />
      <Route path="suppliers" element={<WorkerRoute><AdminSuppliersPage /></WorkerRoute>} />
      <Route path="purchase-orders" element={<WorkerRoute><AdminPurchaseOrdersPage /></WorkerRoute>} />
      <Route path="ordenes-compra/importar" element={<WorkerRoute><ImportarOrdenPage /></WorkerRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
