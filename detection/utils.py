import json
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


def generate_cve_pdf(cve):
    """
    Render a CVE classification result into a PDF using ReportLab.
    Returns (filename, pdf_bytes).
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    width, height = letter
    x = 0.75 * inch
    y = height - 0.75 * inch
    line_height = 14

    def draw(text, font="Helvetica", size=11):
        nonlocal y
        c.setFont(font, size)
        text = "" if text is None else str(text)
        max_chars = 110

        while len(text) > max_chars:
            c.drawString(x, y, text[:max_chars])
            y -= line_height
            text = text[max_chars:]
            if y < 0.75 * inch:
                c.showPage()
                y = height - 0.75 * inch
                c.setFont(font, size)

        c.drawString(x, y, text)
        y -= line_height
        if y < 0.75 * inch:
            c.showPage()
            y = height - 0.75 * inch

    engine = cve.engine_response or {}

    # Header
    draw("CVE Classification Report", font="Helvetica-Bold", size=16)
    y -= 6
    draw(f"Classification ID: {cve.id}")
    draw(f"Classified at: {cve.classified_at}")
    y -= 10

    # Input text (truncated)
    draw("Input Text", font="Helvetica-Bold", size=13)
    input_text = (cve.input_text or "")[:2000]
    for line_text in input_text.splitlines():
        draw(line_text, size=9)
    y -= 8

    # Engine response
    draw("Engine Response", font="Helvetica-Bold", size=13)
    raw = json.dumps(engine, indent=2)[:8000]
    for line_text in raw.splitlines():
        draw(line_text, size=8)

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"cve_{cve.id}.pdf"
    return filename, pdf_bytes
