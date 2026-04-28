from django.urls import path

from .views import AddCartItemView, CartView, ClearCartView, RemoveCartItemView, UpdateCartItemView

urlpatterns = [
    path('', CartView.as_view(), name='cart-detail'),
    path('items/', AddCartItemView.as_view(), name='cart-add-item'),
    path('items/<int:item_id>/', UpdateCartItemView.as_view(), name='cart-update-item'),
    path('items/<int:item_id>/remove/', RemoveCartItemView.as_view(), name='cart-remove-item'),
    path('clear/', ClearCartView.as_view(), name='cart-clear'),
]
