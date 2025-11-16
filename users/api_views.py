from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from accounts.permissions import IsAdmin
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request):
        users = User.objects.all().values('id', 'username', 'email', 'role')
        return Response(users)

class UpdateUserRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        new_role = request.data.get('role')

        if not user_id or not new_role:
            return Response({"error": "User ID and role are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            user.role = new_role
            user.save()
            return Response({"message": "Role updated successfully."})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
