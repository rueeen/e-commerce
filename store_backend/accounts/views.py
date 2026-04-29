from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminUser
from .serializers import (
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    UserRegistrationSerializer,
    UserRoleUpdateSerializer,
    UserSerializer,
    UserStatusUpdateSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.select_related("profile").order_by("id")
    serializer_class = AdminUserListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("profile")
    serializer_class = AdminUserDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    http_method_names = ["get", "patch"]

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user and request.data.get("is_active") is False:
            return Response({"is_active": ["No puedes desactivar tu propia cuenta."]}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)


class AdminUserRoleUpdateView(generics.UpdateAPIView):
    queryset = User.objects.select_related("profile")
    serializer_class = UserRoleUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    http_method_names = ["patch"]

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class AdminUserStatusUpdateView(generics.UpdateAPIView):
    queryset = User.objects.select_related("profile")
    serializer_class = UserStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    http_method_names = ["patch"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["user_instance"] = self.get_object()
        return context

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)
