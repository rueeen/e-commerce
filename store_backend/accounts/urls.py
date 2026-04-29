from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AdminUserDetailView,
    AdminUserListView,
    AdminUserRoleUpdateView,
    AdminUserStatusUpdateView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('users/', AdminUserListView.as_view(), name='admin_users_list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_users_detail'),
    path('users/<int:pk>/role/', AdminUserRoleUpdateView.as_view(), name='admin_users_role_update'),
    path('users/<int:pk>/status/', AdminUserStatusUpdateView.as_view(), name='admin_users_status_update'),
]
