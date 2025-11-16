from rest_framework.views import APIView
from rest_framework import generics 
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import render 
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator 
from django.template.loader import render_to_string 
from django.views import View 
from weasyprint import HTML

from .models import AuditLog
from .serializers import AuditLogSerializer
from accounts.permissions import IsAdmin, IsAdminOrAnalyst, IsAnyRole

class AuditLogPDFView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        logs = AuditLog.objects.all().order_by('-timestamp')
        html_string = render_to_string('audit/logs_pdf.html', {'logs': logs})
        html = HTML(string=html_string)
        pdf = html.write_pdf()
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="audit_logs.pdf"'
        return response

class AuditLogListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAnalyst]

    def get(self, request):
        logs = AuditLog.objects.all().order_by('-timestamp')
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

class AuditLogListAPIView(generics.ListAPIView):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class AuditLogDashboardView(View):
    @method_decorator(login_required)
    def get(self, request):
        logs = AuditLog.objects.all().order_by('-timestamp')
        return render(request, 'audit/dashboard.html', {'logs': logs})
