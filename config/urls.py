from django.contrib import admin
from detection.views import AdminDashboardView
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
    path('api/users/', include('users.urls')),
    path('api/alerts/', include('alerts.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/detection/', include('detection.urls')),
    path("api/pentest/", include("pentest.urls", namespace="pentest")),


]

