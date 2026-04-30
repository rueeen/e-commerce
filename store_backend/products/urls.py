from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CardViewSet, CategoryViewSet, MTGScryfallViewSet, ProductViewSet

router = DefaultRouter()
router.register('cards', CardViewSet, basename='card')
router.register('products', ProductViewSet, basename='product')
router.register('categories', CategoryViewSet, basename='category')
router.register('mtg/cards', MTGScryfallViewSet, basename='mtg-cards')

urlpatterns = [path('', include(router.urls))]
