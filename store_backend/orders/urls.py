from rest_framework.routers import DefaultRouter

from .views import AssistedPurchaseOrderViewSet, OrderViewSet

app_name = "orders"

router = DefaultRouter()
router.register("assisted", AssistedPurchaseOrderViewSet,
                basename="assisted-order")
router.register("", OrderViewSet, basename="order")

urlpatterns = router.urls
