from rest_framework import generics, permissions

from .serializers import DigitalLibraryItemSerializer


class MyDigitalLibraryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DigitalLibraryItemSerializer

    def get_queryset(self):
        return []
