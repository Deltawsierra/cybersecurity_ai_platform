from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from audit.models import AuditLog  # ✅ Import the AuditLog model

class SendEmailAlertView(APIView):
    def post(self, request):
        to_email = request.data.get('to')
        subject = request.data.get('subject')
        message = request.data.get('message')

        if not to_email or not subject or not message:
            return Response({'error': 'Missing fields'}, status=400)

        try:
            # ✅ Attempt to send the email
            send_mail(subject, message, 'noreply@cybersec.local', [to_email])

            # ✅ Log successful alert
            AuditLog.objects.create(
                alert_type='email',
                recipient=to_email,
                subject=subject,
                message=message,
                status='sent'
            )

            return Response({'status': 'Email sent'}, status=200)

        except Exception as e:
            # ✅ Log failure
            AuditLog.objects.create(
                alert_type='email',
                recipient=to_email,
                subject=subject,
                message=message,
                status='failed',
                error=str(e)
            )

            return Response({'error': str(e)}, status=500)

