from rest_framework import serializers
from .models import ThreatDetection
from .models import CVEClassification 

class ThreatDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreatDetection
        fields = '__all__'

class ThreatDetectionScanSerializer(serializers.Serializer):
    file_name = serializers.CharField()
    content = serializers.CharField()

class ScanUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreatDetection
        fields = ['id', 'file_name', 'uploaded_file', 'threat_type', 'confidence', 'detected', 'scanned_at']
        read_only_fields = ['id', 'scanned_at', 'detected', 'threat_type', 'confidence']

class ThreatDetectionUploadSerializer(serializers.Serializer):
    uploaded_file = serializers.FileField()
    file_name = serializers.CharField(max_length=255)
    
    def create(self, validated_data):
        # Simulate AI threat detection
        file = validated_data.get('uploaded_file')
        filename = file.name if file else 'unknown'

        # Fake "AI" logic
        threat_detected = "trojan" in filename.lower()
        threat_type = "Trojan" if threat_detected else "Benign"
        confidence = 0.95 if threat_detected else 0.1

        validated_data['file_name'] = filename
        validated_data['threat_type'] = threat_type
        validated_data['confidence'] = confidence
        validated_data['detected'] = threat_detected
        return super().create(validated_data)
    
class CVEClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CVEClassification
        fields = '__all__'
