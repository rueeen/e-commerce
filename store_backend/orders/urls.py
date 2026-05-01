from rest_framework.routers import DefaultRouter

from .views import AssistedPurchaseOrderViewSet, OrderViewSet

router = DefaultRouter()
router.register("assisted", AssistedPurchaseOrderViewSet, basename="assisted-order")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = router.urls
