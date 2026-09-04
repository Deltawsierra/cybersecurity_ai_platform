from rest_framework.permissions import BasePermission


class IsAuthenticatedWithRole(BasePermission):
    """
    Base permission: user must be authenticated and have a role attribute.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and hasattr(user, "role"))


class IsAdmin(IsAuthenticatedWithRole):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_admin


class IsAnalyst(IsAuthenticatedWithRole):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_analyst


class IsViewer(IsAuthenticatedWithRole):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_viewer


class IsAdminOrAnalyst(IsAuthenticatedWithRole):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and (request.user.is_admin or request.user.is_analyst)
        )


class IsAnyRole(IsAuthenticatedWithRole):
    """
    Any authenticated user holding a role this system recognises.

    This used to add nothing to its base class, whose only extra test was that
    the user has a `role` attribute at all, which is always true. A blank or
    misspelled role passed it.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in request.user.Roles.values

