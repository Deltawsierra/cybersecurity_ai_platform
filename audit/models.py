from django.db import models

class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    alert_type = models.CharField(max_length=50, default='email')  # email, sms, etc.
    recipient = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=50, default='sent')  # sent, failed, etc.
    error = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"[{self.timestamp}] {self.alert_type.upper()} → {self.recipient}"

