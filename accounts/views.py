from django.contrib.auth import get_user_model

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.serializers import UserSerializer
from accounts.permissions import IsAdmin

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only user management API.
    """

    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
      """Return the currently authenticated user's profile."""
      serializer = self.get_serializer(request.user)
      return Response(serializer.data)

    @action(detail=True, methods=["patch"])
    def set_role(self, request, pk=None):
        """
        Update a user's role.
        """
        user = self.get_object()
        new_role = request.data.get("role")

        valid_roles = [choice[0] for choice in User.Roles.choices]
        if new_role not in valid_roles:
            return Response(
                {"error": f"Invalid role. Must be one of {valid_roles}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.role = new_role
        user.save(update_fields=["role"])

        return Response(
            {"status": f"Role updated to '{new_role}' for user {user.username}."}
        )

