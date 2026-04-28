from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.permissions import is_admin_user, is_worker_user


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and (is_admin_user(request.user) or is_worker_user(request.user)))
