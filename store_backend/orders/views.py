from django.core.exceptions import ValidationError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_admin_user, is_worker_user

from .models import AssistedPurchaseOrder, Order
from .serializers import AssistedPurchaseOrderSerializer, OrderSerializer
from .services import cancel_order, confirm_order_payment, create_order_from_cart


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
