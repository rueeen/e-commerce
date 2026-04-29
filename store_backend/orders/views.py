from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_admin_user, is_worker_user
from .models import AssistedPurchaseOrder
from .serializers import AssistedPurchaseOrderSerializer


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

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        if not (is_admin_user(request.user) or is_worker_user(request.user)):
            return Response({"detail": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        new_status = request.data.get("status")
        valid = {s[0] for s in AssistedPurchaseOrder.Status.choices}
        if new_status not in valid:
            return Response({"detail": "Estado inválido"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(order).data)
