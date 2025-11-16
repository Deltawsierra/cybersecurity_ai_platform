from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'alert_type', 'recipient', 'subject', 'status')
    list_filter = ('alert_type', 'status', 'timestamp')
    search_fields = ('recipient', 'subject', 'message', 'error')
