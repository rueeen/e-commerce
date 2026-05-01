from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_admin_user, is_worker_user
from cart.models import Cart
from .models import AssistedPurchaseOrder, Order, OrderItem
from .serializers import AssistedPurchaseOrderSerializer, OrderSerializer
from .services import cancel_order, create_order_from_cart


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items__product", "user")
        if is_admin_user(self.request.user) or is_worker_user(self.request.user):
            return qs
        return qs.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="from-cart")
    def from_cart(self, request):
        try:
            order = create_order_from_cart(request.user)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.user_id != request.user.id and not (is_admin_user(request.user) or is_worker_user(request.user)):
            return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        order = cancel_order(order, user=request.user)
        return Response(self.get_serializer(order).data)



class AssistedPurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = AssistedPurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AssistedPurchaseOrder.objects.prefetch_related("items__product", "user")
        if is_admin_user(self.request.user) or is_worker_user(self.request.user):
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        order = self.get_object()
        order.calculate_totals()
        order.save()
        return Response(self.get_serializer(order).data)
