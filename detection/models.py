from django.db import models

class ThreatDetection(models.Model):
    file_name = models.CharField(max_length=255)
    uploaded_file = models.FileField(upload_to='uploads/', null=True, blank=True)
    threat_type = models.CharField(max_length=100)
    confidence = models.FloatField()
    detected = models.BooleanField(default=False)
    scanned_at = models.DateTimeField(auto_now_add=True)

    explanation = models.JSONField(default=list, blank=True, null=True)

    def __str__(self):
        return self.file_name

class ReportEmailLog(models.Model):
    detection = models.ForeignKey(ThreatDetection, on_delete=models.CASCADE)
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report sent to {self.email} for scan ID {self.detection.id}"
    
    
class CVEClassification(models.Model):
     input_text = models.TextField()
     label = models.CharField(max_length=100)
     confidence = models.FloatField()
     keywords = models.JSONField()
     classified_at = models.DateTimeField(auto_now_add=True)

     def __str__(self):
        return f"{self.label} ({self.confidence})"



