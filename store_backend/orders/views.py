from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_admin_user, is_worker_user
from django.contrib.auth import get_user_model
from products.models import Product

from .models import AssistedPurchaseOrder, Order
from .serializers import (
    AssistedPurchaseOrderSerializer,
    ManualOrderCreateSerializer,
    OrderSerializer,
)
from .services import cancel_order, confirm_order_payment, create_order_from_cart

User = get_user_model()

def validation_error_response(exc):
    if hasattr(exc, "message"):
        detail = exc.message
    elif hasattr(exc, "messages"):
        detail = exc.messages
    else:
        detail = str(exc)

    return Response(
        {"detail": detail},
        status=status.HTTP_400_BAD_REQUEST,
    )


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related("user").prefetch_related(
            "items__product"
        )

        if is_admin_user(self.request.user) or is_worker_user(self.request.user):
            return qs

        return qs.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="from-cart")
    def from_cart(self, request):
        try:
            order = create_order_from_cart(request.user)
        except ValidationError as exc:
            return validation_error_response(exc)

        return Response(
            self.get_serializer(order).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="confirm-payment")
    def confirm_payment(self, request, pk=None):
        order = self.get_object()

        if not (is_admin_user(request.user) or is_worker_user(request.user)):
            return Response(
                {"detail": "No autorizado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = confirm_order_payment(order, user=request.user)
        except ValidationError as exc:
            return validation_error_response(exc)

        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()

        is_owner = order.user_id == request.user.id
        is_staff_role = is_admin_user(
            request.user) or is_worker_user(request.user)

        if not is_owner and not is_staff_role:
            return Response(
                {"detail": "No autorizado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = cancel_order(order, user=request.user)
        except ValidationError as exc:
            return validation_error_response(exc)

        return Response(self.get_serializer(order).data)

    @action(detail=False, methods=["post"], url_path="manual")
    @transaction.atomic
    def manual(self, request):
        if not (is_admin_user(request.user) or is_worker_user(request.user)):
            return Response(
                {"detail": "No autorizado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManualOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.get(id=data["user_id"])
        item_payloads = data["items"]
        product_ids = [item["product_id"] for item in item_payloads]
        products = Product.objects.in_bulk(product_ids)

        validated_items = []
        subtotal = 0

        for item in item_payloads:
            product = products.get(item["product_id"])
            quantity = item["quantity"]

            if not product:
                return Response(
                    {"detail": "Uno de los productos indicados no existe."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not product.is_active:
                return Response(
                    {"detail": f"El producto '{product.name}' no está activo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if product.stock < quantity:
                return Response(
                    {"detail": f"Stock insuficiente para '{product.name}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            unit_price_clp = item.get("unit_price_clp")
            if unit_price_clp is None:
                unit_price_clp = int(product.computed_price_clp or product.price_clp or 0)

            if unit_price_clp <= 0:
                return Response(
                    {"detail": f"El precio para '{product.name}' debe ser mayor a 0."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            line_subtotal = quantity * unit_price_clp
            subtotal += line_subtotal
            validated_items.append({
                "product": product,
                "quantity": quantity,
                "unit_price_clp": unit_price_clp,
                "subtotal_clp": line_subtotal,
            })

        shipping_clp = data.get("shipping_clp", 0)
        discount_clp = data.get("discount_clp", 0)
        total_clp = max(subtotal + shipping_clp - discount_clp, 0)

        order = Order.objects.create(
            user=user,
            status=Order.Status.PENDING,
            subtotal_clp=subtotal,
            shipping_clp=shipping_clp,
            discount_clp=discount_clp,
            total_clp=total_clp,
            stock_consumed=False,
        )

        for item in validated_items:
            product = item["product"]
            order.items.create(
                product=product,
                product_name_snapshot=product.name,
                product_type_snapshot=product.product_type,
                quantity=item["quantity"],
                unit_price_clp=item["unit_price_clp"],
                subtotal_clp=item["subtotal_clp"],
                unit_cost_clp=0,
                total_cost_clp=0,
                gross_profit_clp=0,
            )

        return Response(
            self.get_serializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class AssistedPurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = AssistedPurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AssistedPurchaseOrder.objects.select_related(
            "user",
            "supplier",
        ).prefetch_related(
            "items__product"
        )

        if is_admin_user(self.request.user) or is_worker_user(self.request.user):
            return qs

        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        order = self.get_object()

        is_owner = order.user_id == request.user.id
        is_staff_role = is_admin_user(
            request.user) or is_worker_user(request.user)

        if not is_owner and not is_staff_role:
            return Response(
                {"detail": "No autorizado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order.calculate_totals()
        order.save()

        return Response(self.get_serializer(order).data)
