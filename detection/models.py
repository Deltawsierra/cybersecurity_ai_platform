from django.db import models


# =========================================================
# DEFENDER (ENGINE-BACKED)
# =========================================================

class ThreatDetection(models.Model):
    """
    Stores a single defender (blue-team) analysis result.
    The engine_response is the source of truth.
    """

    file_name = models.CharField(max_length=255)
    detected = models.BooleanField(default=False)
    engine_response = models.JSONField(default=dict, blank=True)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scanned_at"]
        indexes = [
            models.Index(fields=["detected"]),
            models.Index(fields=["scanned_at"]),
        ]

    def __str__(self):
        return f"{self.file_name} ({'detected' if self.detected else 'clean'})"


# =========================================================
# EMAIL LOGGING
# =========================================================

class ReportEmailLog(models.Model):
    """
    Records when a report was emailed and to whom.
    """

    detection = models.ForeignKey(
        ThreatDetection,
        on_delete=models.CASCADE,
        related_name="email_logs",
    )
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Report sent to {self.recipient_email} for detection {self.detection.id}"


# =========================================================
# CVE CLASSIFICATION (ENGINE-BACKED)
# =========================================================

class CVEClassifyResult(models.Model):
    """
    Stores CVE classification results returned by the engine.
    """

    input_text = models.TextField()
    engine_response = models.JSONField(default=dict, blank=True)
    classified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-classified_at"]

    def __str__(self):
        return f"CVE classification {self.id}"





