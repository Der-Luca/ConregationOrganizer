import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer


MONTH_NAMES_ES = {
    "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
    "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
}

DAY_NAMES_ES = {
    0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves",
    4: "Viernes", 5: "Sábado", 6: "Domingo",
}


def generate_meeting_points_pdf(meeting_points, month: str) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    elements = []

    cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontSize=9, leading=11)
    link_style = ParagraphStyle("link", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#2563EB"))

    # Title
    year, month_num = month.split("-")
    month_name = MONTH_NAMES_ES.get(month_num, month_num)
    title = Paragraph(
        f"<b>Puntos de Encuentro — {month_name} {year}</b>",
        styles["Title"],
    )
    elements.append(title)
    elements.append(Spacer(1, 6 * mm))

    # Table: 5 columns (no Enlace column), link goes in a span row below
    header = ["Fecha", "Hora", "Lugar", "Director", "Tema"]
    data = [header]
    row_types = ["header"]  # track which rows are "data" vs "link"

    for mp in meeting_points:
        day_name = DAY_NAMES_ES.get(mp.date.weekday(), "")
        date_str = f"{day_name} {mp.date.strftime('%d/%m/%Y')}"
        time_str = mp.time.strftime("%H:%M")
        conductor_name = ""
        if mp.conductor:
            conductor_name = f"{mp.conductor.firstname} {mp.conductor.lastname}"

        data.append([
            Paragraph(date_str, cell_style),
            Paragraph(time_str, cell_style),
            Paragraph(mp.location, cell_style),
            Paragraph(conductor_name, cell_style),
            Paragraph(mp.outline or "", cell_style),
        ])
        row_types.append("data")

        # Link row spanning all columns
        if mp.link:
            link_text = Paragraph(f"Enlace: <a href=\"{mp.link}\">{mp.link}</a>", link_style)
        else:
            link_text = Paragraph("", link_style)
        data.append([link_text, "", "", "", ""])
        row_types.append("link")

    if len(data) == 1:
        data.append(["", "", "Sin puntos de encuentro", "", ""])
        row_types.append("data")

    col_widths = [38 * mm, 18 * mm, 45 * mm, 40 * mm, 39 * mm]

    table = Table(data, colWidths=col_widths, repeatRows=1)

    style_cmds = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        # Defaults
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]

    for i, rtype in enumerate(row_types):
        if rtype == "data":
            style_cmds.append(("TOPPADDING", (0, i), (-1, i), 6))
            style_cmds.append(("BOTTOMPADDING", (0, i), (-1, i), 4))
            style_cmds.append(("LINEABOVE", (0, i), (-1, i), 0.5, colors.HexColor("#E2E8F0")))
        elif rtype == "link":
            # Span link row across all columns
            style_cmds.append(("SPAN", (0, i), (-1, i)))
            style_cmds.append(("TOPPADDING", (0, i), (-1, i), 0))
            style_cmds.append(("BOTTOMPADDING", (0, i), (-1, i), 4))
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F8FAFC")))

    # Bottom border
    style_cmds.append(("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#E2E8F0")))
    # Left/right borders
    style_cmds.append(("LINEBEFORE", (0, 0), (0, -1), 0.5, colors.HexColor("#E2E8F0")))
    style_cmds.append(("LINEAFTER", (-1, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")))

    table.setStyle(TableStyle(style_cmds))

    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer
