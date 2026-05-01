from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_admin_user, is_worker_user
from cart.models import Cart
from products.models import KardexMovement
from products.inventory_services import create_stock_movement
from .models import AssistedPurchaseOrder, Order, OrderItem
from .serializers import AssistedPurchaseOrderSerializer, OrderSerializer


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items__product", "user")
        if is_admin_user(self.request.user) or is_worker_user(self.request.user):
            return qs
        return qs.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="from-cart")
    @transaction.atomic
    def from_cart(self, request):
        cart, _ = Cart.objects.select_for_update().get_or_create(user=request.user)
        items = list(cart.items.select_related("product"))
        if not items:
            return Response({"detail": "Carrito vacío."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(user=request.user, status=Order.Status.PENDING)
        total_clp = 0
        for item in items:
            product = item.product
            if not product.is_active or product.stock < item.quantity:
                return Response({"detail": f"Stock inválido para {product.name}."}, status=status.HTTP_400_BAD_REQUEST)
            unit_price_clp = int(product.computed_price_clp)
            subtotal_clp = unit_price_clp * item.quantity
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                unit_price=unit_price_clp,
                subtotal=subtotal_clp,
                product_name_snapshot=product.name,
                product_type_snapshot=product.product_type,
                unit_price_clp=unit_price_clp,
                subtotal_clp=subtotal_clp,
            )
            prev = product.stock
            product.stock = prev - item.quantity
            product.save(update_fields=["stock"])
            create_stock_movement(
                product=product,
                movement_type=KardexMovement.MovementType.SALE_OUT,
                quantity=item.quantity,
                created_by=request.user,
                unit_price_clp=unit_price_clp,
                reference_type="ORDER",
                reference_id=str(order.id),
                reference_label=f"Orden #{order.id}",
                notes="Descuento por creación de orden",
            )
            total_clp += subtotal_clp

        order.total_amount = total_clp
        order.stock_deducted = True
        order.save(update_fields=["total_amount", "stock_deducted", "updated_at"])
        cart.items.all().delete()
        return Response(self.get_serializer(order).data, status=status.HTTP_201_CREATED)


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
