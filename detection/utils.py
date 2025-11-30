from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from .models import ThreatDetection, ReportEmailLog
from .models import CVEClassification

try:
    from weasyprint import HTML, CSS  # CSS may or may not be used; safe to import
    WEASYPRINT_AVAILABLE = True
except Exception as e:  # catches ImportError, OSError, etc.
    HTML = None  # type: ignore
    CSS = None   # type: ignore
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_IMPORT_ERROR = e

def send_detection_report_email(detection_id, recipient_email):
    # If WeasyPrint isn't usable (missing native libs), skip PDF generation
    if not WEASYPRINT_AVAILABLE:
        print(
            "send_detection_report_email: PDF generation skipped – "
            "WeasyPrint is not available:",
            WEASYPRINT_IMPORT_ERROR,
        )
        return

    try:
        detection = ThreatDetection.objects.get(pk=detection_id)
    except ThreatDetection.DoesNotExist:
        return

    html_content = render_to_string(
        "detection/report_template.html",
        {"detection": detection},
    )
    pdf_file = HTML(string=html_content).write_pdf()

    email = EmailMessage(
        subject=f"Threat Detection Report: {detection.file_name}",
        body="Attached is the PDF report for the scan.",
        from_email=None,  # uses DEFAULT_FROM_EMAIL
        to=[recipient_email],
    )
    email.attach(f"report_{detection.id}.pdf", pdf_file, "application/pdf")
    email.send()

    # Optional: Log it
    ReportEmailLog.objects.create(
        detection=detection,
        recipient_email=recipient_email,
    )


def send_cve_pdf_report(classification_id, recipient_email):
    # If WeasyPrint isn't usable, skip instead of crashing
    if not WEASYPRINT_AVAILABLE:
        print(
            "send_cve_pdf_report: PDF generation skipped – "
            "WeasyPrint is not available:",
            WEASYPRINT_IMPORT_ERROR,
        )
        return

    classification = CVEClassification.objects.get(id=classification_id)

    html = render_to_string(
        "detection/cve_report_template.html",
        {"classification": classification},
    )
    pdf_file = HTML(string=html).write_pdf()

    email = EmailMessage(
        subject=f"CVE Classification Report: {classification.label}",
        body="Please find the attached CVE report.",
        from_email=None,
        to=[recipient_email],
    )
    email.attach("cve_report.pdf", pdf_file, "application/pdf")
    email.send()


def send_cve_report_email(classification_id, recipient_email):
    send_cve_pdf_report(classification_id, recipient_email)

