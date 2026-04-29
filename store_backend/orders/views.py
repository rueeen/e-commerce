from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AssistedPurchaseOrder
from .serializers import AssistedPurchaseOrderSerializer


class AssistedPurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = AssistedPurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AssistedPurchaseOrder.objects.prefetch_related("items__product")
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["put"], url_path="status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        valid = {s[0] for s in AssistedPurchaseOrder.Status.choices}
        if new_status not in valid:
            return Response({"detail": "Estado inválido"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(order).data)
