from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import AdminOnlyView, AnalystOnlyView, ViewerOnlyView, UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('admin-only/', AdminOnlyView.as_view()),
    path('analyst-only/', AnalystOnlyView.as_view()),
    path('viewer-only/', ViewerOnlyView.as_view()),
    
]
