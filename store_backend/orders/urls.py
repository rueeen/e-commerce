from django.urls import path

from .views import CheckoutView, UserOrderDetailView, UserOrderListView

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', UserOrderListView.as_view(), name='order-list'),
    path('<int:pk>/', UserOrderDetailView.as_view(), name='order-detail'),
]
