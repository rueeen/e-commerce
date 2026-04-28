from rest_framework import generics, permissions

from .models import PurchaseDigitalAccess
from .serializers import PurchaseDigitalAccessSerializer


class MyDigitalLibraryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PurchaseDigitalAccessSerializer

    def get_queryset(self):
        return PurchaseDigitalAccess.objects.filter(user=self.request.user).select_related("product")
