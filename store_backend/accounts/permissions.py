from rest_framework.permissions import BasePermission


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser or user.is_staff:
        return "admin"
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", "customer")


def is_admin_user(user):
    return get_user_role(user) == "admin"


def is_worker_user(user):
    return get_user_role(user) == "worker"


def is_customer_user(user):
    return get_user_role(user) == "customer"


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_admin_user(request.user))


class IsAdminOrWorkerUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (is_admin_user(user) or is_worker_user(user)))
