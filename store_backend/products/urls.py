from rest_framework.routers import DefaultRouter

from .views import CardViewSet, CategoryViewSet, ProductViewSet, ScryfallImportViewSet

router = DefaultRouter()
router.register('cards', CardViewSet, basename='card')
router.register('products', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('import/scryfall', ScryfallImportViewSet, basename='scryfall-import')

urlpatterns = router.urls
