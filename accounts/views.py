from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin, IsAnalyst, IsViewer

class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"message": "Hello Admin!"})

class AnalystOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAnalyst]

    def get(self, request):
        return Response({"message": "Hello Analyst!"})

class ViewerOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsViewer]

    def get(self, request):
        return Response({"message": "Hello Viewer!"})


# === User management API for admins ===
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer

User = get_user_model()

class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdmin])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')
        if role not in ['admin', 'analyst', 'viewer']:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        user.save()
        return Response({'status': f'Role updated to {role}'})


from rest_framework import generics, permissions
from accounts.models import CustomUser
from accounts.serializers import UserSerializer
from accounts.permissions import IsAdmin

class UserListView(generics.ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

class RoleUpdateView(generics.UpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        new_role = request.data.get('role')
        if new_role in ['admin', 'analyst', 'viewer']:
            user.role = new_role
            user.save()
            return Response({"message": f"Role updated to '{new_role}' for user {user.username}."})
        return Response({"error": "Invalid role specified."}, status=400)
