from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CardViewSet, CategoryViewSet, InventoryDashboardView, KardexViewSet, MTGScryfallViewSet, PricingSettingsViewSet, ProductViewSet, PurchaseOrderViewSet, SupplierViewSet

router = DefaultRouter()
router.register('cards', CardViewSet, basename='card')
router.register('products', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('mtg/cards', MTGScryfallViewSet, basename='mtg-cards')
router.register('pricing-settings', PricingSettingsViewSet, basename='pricing-settings')
router.register('kardex', KardexViewSet, basename='kardex')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('purchase-orders', PurchaseOrderViewSet, basename='purchase-order')

urlpatterns = [
    path('', include(router.urls)),
    path('inventory/dashboard/', InventoryDashboardView.as_view(), name='inventory-dashboard'),
]
