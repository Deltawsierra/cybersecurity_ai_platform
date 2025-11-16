from django.urls import path, include
from .views import ThreatFileUploadView  
from .views import MLScanOnlyAPIView
from .views import DashboardSummaryAPIView
from .views import PDFReportAPIView
from .views import PDFReportEmailView
from .views import DashboardPDFReportView
from .views import AdminDashboardView
from .views import CVEClassifyAPIView


urlpatterns = [
    path('upload/', ThreatFileUploadView.as_view(), name='threat-upload'),
    path('scan/', MLScanOnlyAPIView.as_view(), name='ml_scan'),
    path('dashboard/summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
    path('report/<int:pk>/pdf/', PDFReportAPIView.as_view(), name='pdf-report'),
    path('report/<int:pk>/email/', PDFReportEmailView.as_view(), name='report-email'),
    path('dashboard/pdf/', DashboardPDFReportView.as_view(), name='dashboard-pdf'),
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('classify-cve/', CVEClassifyAPIView.as_view(), name='classify-cve'), 
    path('api/pentest/', include('pentest.urls')),
 
    # path('scan/', ThreatDetectionListCreateView.as_view(), name='threat-scan'),  # optional if re-added later
]


