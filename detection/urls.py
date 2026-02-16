from django.urls import path

from .views import (
    DefenderTextScanAPIView,
    DefenderFileScanAPIView,
    DefenderListAPIView,
    DefenderDetailAPIView,
    CVEClassifyAPIView,
    CVEClassifyListAPIView,
    CVEClassifyDetailAPIView,
    CVEPDFAPIView,
    CVEEmailAPIView,
)

app_name = "detection"

urlpatterns = [
    # =================================================
    # DEFENDER (BLUE TEAM)
    # =================================================
    path(
        "defender/text/",
        DefenderTextScanAPIView.as_view(),
        name="defender-text-scan",
    ),
    path(
        "defender/file/",
        DefenderFileScanAPIView.as_view(),
        name="defender-file-scan",
    ),
    path(
        "defender/",
        DefenderListAPIView.as_view(),
        name="defender-list",
    ),
    path(
        "defender/<int:pk>/",
        DefenderDetailAPIView.as_view(),
        name="defender-detail",
    ),

    # =================================================
    # CVE CLASSIFICATION
    # =================================================
    path(
        "cve/classify/",
        CVEClassifyAPIView.as_view(),
        name="cve-classify",
    ),
    path(
        "cve/",
        CVEClassifyListAPIView.as_view(),
        name="cve-list",
    ),
    path(
        "cve/<int:pk>/",
        CVEClassifyDetailAPIView.as_view(),
        name="cve-detail",
    ),
    path(
        "cve/<int:pk>/pdf/",
        CVEPDFAPIView.as_view(),
        name="cve-pdf",
    ),
    path(
        "cve/<int:pk>/email/",
        CVEEmailAPIView.as_view(),
        name="cve-email",
    ),
]




    




