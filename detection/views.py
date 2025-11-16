from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import ThreatDetection, ReportEmailLog
from .serializers import ThreatDetectionUploadSerializer
from .utils import  send_detection_report_email
from .models import CVEClassification 
import os
import joblib

# Path to trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ml_models', 'threat_model.pkl')

class ThreatFileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        serializer = ThreatDetectionUploadSerializer(data=request.data)
        if serializer.is_valid():
            uploaded_file = request.FILES['uploaded_file']
            file_name = serializer.validated_data['file_name']
            recipient_email = request.data.get('recipient_email')  

            # Save uploaded file temporarily
            file_path = os.path.join('uploads', uploaded_file.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)

            with open(file_path, 'r', errors='ignore') as f:
                content = f.read()

            try:
                model = joblib.load(MODEL_PATH)
                prediction = model.predict([content])[0]
                confidence_scores = model.predict_proba([content])[0]
                confidence = max(confidence_scores)
                detected = prediction.lower() != 'benign'
                threat_type = prediction
            except Exception as e:
                return Response({'error': f'Model prediction failed: {str(e)}'}, status=500)

            # Save to DB
            result = ThreatDetection.objects.create(
                file_name=file_name,
                uploaded_file=uploaded_file,
                threat_type=threat_type,
                confidence=round(confidence, 2),
                detected=detected
            )

            #  Auto-send report if threat detected and recipient provided
            recipient_email = request.data.get('recipient_email')
            if detected and recipient_email:
                send_detection_report_email(result.id, recipient_email)

            return Response({
                'id': result.id,
                'file_name': result.file_name,
                'uploaded_file': result.uploaded_file.url,
                'threat_type': result.threat_type,
                'confidence': result.confidence,
                'detected': result.detected,
                'scanned_at': result.scanned_at
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ML-based scan-only endpoint (no file upload)
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import os
import joblib

from .models import ThreatDetection
from .serializers import ThreatDetectionScanSerializer

class MLScanOnlyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ThreatDetectionScanSerializer(data=request.data)
        if serializer.is_valid():
            file_name = serializer.validated_data['file_name']
            content = serializer.validated_data['content'].lower()
            recipient_email = request.data.get('recipient_email')  # Optional

            model_path = os.path.join('detection', 'ml_models', 'threat_model.pkl')
            threshold = 0.3
            explanation = []
            detected = False
            confidence = 0.1
            threat_type = "Benign"

            try:
                model = joblib.load(model_path)
                vectorizer = model.named_steps['vectorizer']
                classifier = model.named_steps['classifier']

                X = vectorizer.transform([content])
                proba = classifier.predict_proba(X)[0]
                idx = proba.argmax()
                prediction = classifier.classes_[idx]
                confidence = float(proba[idx])

                if confidence >= threshold:
                    threat_type = prediction
                    detected = prediction != 'benign'

                    feature_names = vectorizer.get_feature_names_out()
                    top_indices = X.toarray()[0].argsort()[::-1][:5]
                    explanation = [feature_names[i] for i in top_indices if X.toarray()[0][i] > 0]
                else:
                    threat_type = "Benign"
                    detected = False
                    explanation = []

            except Exception:
                fallback_keywords = ['malware', 'trojan', 'worm', 'ransomware', 'exploit']
                matched_keywords = [kw for kw in fallback_keywords if kw in content]
                if matched_keywords:
                    threat_type = matched_keywords[0].capitalize()
                    confidence = 0.4
                    detected = True
                    explanation = matched_keywords
                else:
                    threat_type = "Benign"
                    confidence = 0.1
                    detected = False
                    explanation = []

            result = ThreatDetection.objects.create(
                file_name=file_name,
                threat_type=threat_type,
                confidence=round(confidence, 2),
                detected=detected,
                explanation=explanation
            )

            # Auto-send report if threat detected and recipient provided
            if detected and recipient_email:
                from .utils import send_detection_report_email
                send_detection_report_email(result.id, recipient_email)

            return Response({
                "id": result.id,
                "file_name": result.file_name,
                "threat_type": result.threat_type,
                "confidence": result.confidence,
                "detected": result.detected,
                "scanned_at": result.scanned_at,
                "explanation": explanation
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



from datetime import datetime
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ThreatDetection
from collections import Counter
import ast

class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ThreatDetection.objects.all()

        # Optional: filter by date range
        start_date = request.GET.get('start')
        end_date = request.GET.get('end')
        threat_type = request.GET.get('type')
        top_n = int(request.GET.get('top', 10))

        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(scanned_at__date__gte=start)
            except ValueError:
                return Response({'error': 'Invalid start date format. Use YYYY-MM-DD'}, status=400)

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                queryset = queryset.filter(scanned_at__date__lte=end)
            except ValueError:
                return Response({'error': 'Invalid end date format. Use YYYY-MM-DD'}, status=400)

        if threat_type:
            queryset = queryset.filter(threat_type__iexact=threat_type)

        total_scans = queryset.count()
        total_threats = queryset.filter(detected=True).count()

        # Breakdown by threat type
        threat_types = Counter(
            queryset.filter(detected=True).values_list('threat_type', flat=True)
        )

        # Keyword explanation counter
        explanation_counter = Counter()
        for detection in queryset:
            explanation = detection.explanation
            if isinstance(explanation, str):
                try:
                    parsed = ast.literal_eval(explanation)
                    if isinstance(parsed, list):
                        explanation_counter.update(parsed)
                except Exception:
                    explanation_counter.update([explanation])
            elif isinstance(explanation, list):
                explanation_counter.update(explanation)

        return Response({
            "total_scans": total_scans,
            "total_threats": total_threats,
            "threat_breakdown": threat_types,
            "common_keywords": explanation_counter.most_common(top_n)
        })


from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

class PDFReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        detection = get_object_or_404(ThreatDetection, pk=pk)

        html_string = render_to_string('detection/report_template.html', {'detection': detection})
        pdf_file = HTML(string=html_string).write_pdf()

        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'filename="report_{detection.id}.pdf"'
        return response

from django.core.mail import EmailMessage
from weasyprint import HTML
from django.template.loader import render_to_string

class PDFReportEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            detection = ThreatDetection.objects.get(pk=pk)
        except ThreatDetection.DoesNotExist:
            return Response({'error': 'Detection not found'}, status=404)

        # Render HTML template to string
        html_content = render_to_string("detection/report_template.html", {"detection": detection})

        # Generate PDF
        pdf_file = HTML(string=html_content).write_pdf()

        # Email recipient (for now, hardcoded or passed as query param)
        recipient_email = request.query_params.get('email', 'your_email@gmail.com')

        # Compose email
        email = EmailMessage(
            subject=f"Threat Detection Report for {detection.file_name}",
            body="Attached is the PDF report for the threat detection scan.",
            from_email=None,
            to=[recipient_email]
        )
        email.attach(f"report_{detection.id}.pdf", pdf_file, 'application/pdf')

        try:
            email.send()
            ReportEmailLog.objects.create(detection=detection, email=recipient_email)
            return Response({'message': 'Email sent successfully.'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse
import tempfile

class DashboardPDFReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        all_detections = ThreatDetection.objects.all()
        total_scans = all_detections.count()
        total_threats = all_detections.filter(detected=True).count()

        # Threat breakdown
        threat_types = Counter(
            all_detections.filter(detected=True)
            .values_list('threat_type', flat=True)
        )

        # Keyword analysis
        explanation_counter = Counter()
        for detection in all_detections:
            explanation = detection.explanation
            if isinstance(explanation, str):
                try:
                    parsed = ast.literal_eval(explanation)
                    if isinstance(parsed, list):
                        explanation_counter.update(parsed)
                except Exception:
                    explanation_counter.update([explanation])
            elif isinstance(explanation, list):
                explanation_counter.update(explanation)

        # Render HTML
        html_string = render_to_string("dashboard_report_template.html", {
            "total_scans": total_scans,
            "total_threats": total_threats,
            "threat_breakdown": dict(threat_types),
            "common_keywords": explanation_counter.most_common(10),
        })

        # Generate PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf") as output:
            HTML(string=html_string).write_pdf(target=output.name)
            output.seek(0)
            response = HttpResponse(output.read(), content_type="application/pdf")
            response['Content-Disposition'] = 'inline; filename="dashboard_report.pdf"'
            return response

from django.views import View
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.shortcuts import render
from collections import Counter
import ast

@method_decorator(staff_member_required, name='dispatch')
class AdminDashboardView(View):

    def get(self, request):
        all_detections = ThreatDetection.objects.all()
        total_scans = all_detections.count()
        total_threats = all_detections.filter(detected=True).count()

        threat_types = Counter(
            all_detections.filter(detected=True)
            .values_list('threat_type', flat=True)
        )

        explanation_counter = Counter()
        for detection in all_detections:
            explanation = detection.explanation
            if isinstance(explanation, str):
                try:
                    parsed = ast.literal_eval(explanation)
                    if isinstance(parsed, list):
                        explanation_counter.update(parsed)
                except Exception:
                    pass
            elif isinstance(explanation, list):
                explanation_counter.update(explanation)

        context = {
            "total_scans": total_scans,
            "total_threats": total_threats,
            "threat_breakdown": threat_types.items(),
            "common_keywords": explanation_counter.most_common(10),
        }

        return render(request, 'detection/admin_dashboard.html', context)


class CVEClassifyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get("text", "")
        recipient_email = request.data.get("recipient_email", None)

        if not text:
            return Response({"error": "Missing 'text' in request."}, status=400)

        label = "benign"
        confidence = 0.0
        keywords = []

        try:
            # Try Transformer Model First
            transformer_model_path = os.path.join("detection", "ml_models", "transformer_cve_classifier.pkl")
            transformer_model = joblib.load(transformer_model_path)
            label, confidence, proba = transformer_model.predict(text)
            keywords = text.lower().split()[:5]  # Optional: crude keyword extraction


        except Exception as transformer_error:
            print("⚠️ Transformer model failed:", transformer_error)

            try:
                # Fallback: Traditional Model
                classic_model_path = os.path.join("detection", "ml_models", "cve_classifier.pkl")
                model = joblib.load(classic_model_path)
                vectorizer = model.named_steps["vectorizer"]
                classifier = model.named_steps["classifier"]
                X = vectorizer.transform([text.lower()])
                proba = classifier.predict_proba(X)[0]
                idx = proba.argmax()
                label = classifier.classes_[idx]
                confidence = float(proba[idx])

                # Optional keyword extraction
                feature_names = vectorizer.get_feature_names_out()
                top_indices = X.toarray()[0].argsort()[::-1][:5]
                keywords = [feature_names[i] for i in top_indices if X.toarray()[0][i] > 0]

            except Exception as classic_error:
                print("⚠️ Classic model failed:", classic_error)

                # Final Fallback: Simple keyword-based rule
                fallback_keywords = {
                    "rce": ["remote code execution", "rce"],
                    "dos": ["denial of service", "dos", "flood"],
                    "privilege_escalation": ["root access", "privilege escalation"],
                    "sql_injection": ["sql injection"],
                    "xss": ["cross-site scripting", "xss"],
                    "info_disclosure": ["information disclosure", "data leak"]
                }

                for label_key, kw_list in fallback_keywords.items():
                    for kw in kw_list:
                        if kw in text.lower():
                            label = label_key
                            confidence = 0.4
                            keywords.append(kw)

        # Save result to DB
        classification = CVEClassification.objects.create(
            input_text=text,
            label=label,
            confidence=round(confidence, 2),
            keywords=keywords
        )

        # Optional Email Report
        if recipient_email:
            from .utils import send_cve_pdf_report
            send_cve_pdf_report(classification.id, recipient_email)

        return Response({
            "id": classification.id,
            "label": label,
            "confidence": round(confidence, 2),
            "keywords": keywords,
            "classified_at": classification.classified_at,
        })
