from django.urls import path
from .api_views import UserListView, UpdateUserRoleView
from .views import RegisterView, ProtectedView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('all/', UserListView.as_view(), name='user-list'),
    path('update-role/', UpdateUserRoleView.as_view(), name='update-user-role'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', ProtectedView.as_view(), name='protected'),  
]


