from django.template.loader import render_to_string
from weasyprint import HTML


def generate_cve_pdf(cve):
    """
    Render a CVE classification result into a PDF.
    Returns (filename, pdf_bytes).
    """

    context = {
        "cve": cve,
        "result": cve.engine_response,
    }

    html = render_to_string("cve_report.html", context)
    pdf_bytes = HTML(string=html).write_pdf()

    filename = f"cve_{cve.id}.pdf"
    return filename, pdf_bytes


