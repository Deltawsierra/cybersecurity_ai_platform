from rest_framework import serializers
from .models import ThreatDetection, CVEClassifyResult


# =========================================================
# DEFENDER — INPUT SERIALIZERS
# =========================================================

class ThreatDetectionScanSerializer(serializers.Serializer):
    """
    Text-based defender scan input.
    """
    content = serializers.CharField()


class ThreatDetectionUploadSerializer(serializers.Serializer):
    """
    File-based defender scan input.
    """
    uploaded_file = serializers.FileField()


class ThreatDetectionSerializer(serializers.ModelSerializer):
    """
    Minimal read-only serializer for Defender detections.
    Django does not interpret engine results.
    """

    class Meta:
        model = ThreatDetection
        fields = (
            "id",
            "detected",
            "engine_response",
        )
        read_only_fields = fields




# =========================================================
# CVE CLASSIFICATION
# =========================================================

class CVEClassifyInputSerializer(serializers.Serializer):
    """
    Input payload for CVE classification.
    """
    text = serializers.CharField()


class CVEClassifyResultSerializer(serializers.ModelSerializer):
    """
    Read-only CVE classification output.
    """

    class Meta:
        model = CVEClassifyResult
        fields = "__all__"


    

