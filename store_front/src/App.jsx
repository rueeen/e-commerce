import { Navigate, Route, Routes } from 'react-router-dom';

import AdminRoute from './components/AdminRoute';
import CustomerRoute from './components/CustomerRoute';
import ProtectedRoute from './components/ProtectedRoute';
import WorkerRoute from './components/WorkerRoute';

import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';

import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminProductTypesPage from './pages/AdminProductTypesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminKardexPage from './pages/AdminKardexPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminPurchaseOrdersPage from './pages/AdminPurchaseOrdersPage';
import AdminSuppliersPage from './pages/AdminSuppliersPage';
import AdminUsersPage from './pages/AdminUsersPage';

import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import PurchaseOrderImport from './pages/PurchaseOrderImport';
import RegisterPage from './pages/RegisterPage';
import ScryfallSingleCreate from './pages/ScryfallSingleCreate';
import PricingSettingsPage from './pages/PricingSettingsPage';
import PaymentFinalPage from './pages/PaymentFinalPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import DigitalLibraryPage from './pages/DigitalLibraryPage';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/catalog" element={<Navigate to="/catalogo" replace />} />

        <Route path="/productos/:id" element={<ProductDetailPage />} />

        <Route
          path="/carrito"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mis-pedidos"
          element={
            <CustomerRoute>
              <OrdersPage />
            </CustomerRoute>
          }
        />

        <Route
          path="/biblioteca"
          element={
            <CustomerRoute>
              <DigitalLibraryPage />
            </CustomerRoute>
          }
        />

        <Route
          path="/mi-cuenta"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/pago/retorno" element={<PaymentReturnPage />} />
        <Route path="/pago/final" element={<PaymentFinalPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <WorkerRoute>
            <AdminLayout />
          </WorkerRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="productos" element={<AdminProductsPage />} />
        <Route path="categorias" element={<AdminCategoriesPage />} />
        <Route path="tipos-producto" element={<AdminProductTypesPage />} />
        <Route path="pedidos" element={<AdminOrdersPage />} />
        <Route path="kardex" element={<AdminKardexPage />} />
        <Route path="proveedores" element={<AdminSuppliersPage />} />
        <Route path="ordenes-compra" element={<AdminPurchaseOrdersPage />} />
        <Route path="ordenes-compra/importar" element={<PurchaseOrderImport />} />

        <Route
          path="usuarios"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="scryfall-single"
          element={
            <AdminRoute>
              <ScryfallSingleCreate />
            </AdminRoute>
          }
        />

        <Route
          path="pricing-settings"
          element={
            <AdminRoute>
              <PricingSettingsPage />
            </AdminRoute>
          }
        />

        <Route path="importar-excel" element={<Navigate to="ordenes-compra" replace />} />

        <Route path="suppliers" element={<Navigate to="proveedores" replace />} />
        <Route path="purchase-orders" element={<Navigate to="ordenes-compra" replace />} />
        <Route
          path="purchase-orders/import"
          element={<Navigate to="ordenes-compra/importar" replace />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
