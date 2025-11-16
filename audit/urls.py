from django.urls import path
from .views import AuditLogPDFView, AuditLogListAPIView
from .views import AuditLogDashboardView

urlpatterns = [
    path('export-pdf/', AuditLogPDFView.as_view(), name='export_pdf'),
    path('logs/', AuditLogListAPIView.as_view(), name='audit_log_list'),
    path('dashboard/', AuditLogDashboardView.as_view(), name='audit_dashboard'),
]
