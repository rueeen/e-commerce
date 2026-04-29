from rest_framework.routers import DefaultRouter

from .views import AssistedPurchaseOrderViewSet

router = DefaultRouter()
router.register("", AssistedPurchaseOrderViewSet, basename="assisted-order")

urlpatterns = router.urls
