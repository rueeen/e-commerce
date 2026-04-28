from decimal import Decimal

from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart
from digital_library.models import PurchaseDigitalAccess

from .models import Order, OrderItem
from .serializers import OrderSerializer


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_items = list(cart.items.select_related("product"))

        if not cart_items:
            return Response({"detail": "El carrito está vacío."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(user=request.user, status=Order.Status.PENDING)
        total = Decimal("0.00")

        for item in cart_items:
            product = item.product

            if not product.is_active:
                transaction.set_rollback(True)
                return Response(
                    {"detail": f"El producto '{product.name}' está inactivo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if product.product_type == product.ProductType.PHYSICAL and product.stock < item.quantity:
                transaction.set_rollback(True)
                return Response(
                    {"detail": f"Stock insuficiente para '{product.name}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            unit_price = product.price
            subtotal = unit_price * item.quantity
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )
            total += subtotal

            if product.product_type == product.ProductType.PHYSICAL:
                product.stock -= item.quantity
                product.save(update_fields=["stock"])
            else:
                PurchaseDigitalAccess.objects.get_or_create(user=request.user, product=product)

        order.total_amount = total
        order.status = Order.Status.PAID
        order.save(update_fields=["total_amount", "status"])

        cart.items.all().delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class UserOrderListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product")


class UserOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product")
