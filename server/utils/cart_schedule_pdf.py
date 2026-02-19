import io
import calendar
from datetime import datetime, timedelta

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
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


def _week_starts_for_month(year: int, month: int):
    first_day = datetime(year, month, 1).date()
    last_day = datetime(year, month, calendar.monthrange(year, month)[1]).date()
    start = first_day - timedelta(days=first_day.weekday())
    end = last_day + timedelta(days=6 - last_day.weekday())

    weeks = []
    cursor = start
    while cursor <= end:
        weeks.append(cursor)
        cursor += timedelta(days=7)
    return weeks


def _hex_color(value: str):
    if not value:
        return colors.HexColor("#E5E7EB")
    v = value.strip()
    if not v.startswith("#"):
        v = f"#{v}"
    try:
        return colors.HexColor(v)
    except Exception:
        return colors.HexColor("#E5E7EB")


def generate_cart_schedule_pdf(sessions, month: str) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        topMargin=10 * mm,
        bottomMargin=10 * mm,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=14, leading=16)
    header_style = ParagraphStyle("header", parent=styles["Normal"], fontSize=8, leading=9, alignment=1)
    cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontSize=7, leading=8, alignment=1)
    captain_style = ParagraphStyle("captain", parent=styles["Normal"], fontSize=7, leading=8, textColor=colors.red, alignment=1)

    year_str, month_str = month.split("-")
    month_name = MONTH_NAMES_ES.get(month_str, month_str).upper()
    title = Paragraph(f"<b>{month_name} {year_str}</b>", title_style)
    elements = [title, Spacer(1, 4 * mm)]

    if not sessions:
        elements.append(Paragraph("Sin sesiones en este mes", styles["Normal"]))
        doc.build(elements)
        buffer.seek(0)
        return buffer

    # Slot key: (weekday, start_time, end_time, cart_id)
    slots = {}
    for s in sessions:
        weekday = s.date.weekday()
        key = (weekday, s.start_time, s.end_time, s.cart_id)
        if key not in slots:
            slots[key] = {
                "weekday": weekday,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "cart_id": s.cart_id,
                "cart_name": s.cart.name if s.cart else "P-Poc",
                "cart_location": s.cart.location if s.cart else "",
                "cart_color": s.cart.color if s.cart else None,
            }

    slot_list = sorted(
        slots.values(),
        key=lambda x: (x["weekday"], x["start_time"], x["cart_name"]),
    )

    # Build session map by (slot, date)
    session_map = {}
    for s in sessions:
        key = (s.date.weekday(), s.start_time, s.end_time, s.cart_id)
        session_map[(key, s.date)] = s

    # Header rows
    header_time = []
    header_cart = []
    for slot in slot_list:
        time_str = f"{slot['start_time'].strftime('%H:%M')}-{slot['end_time'].strftime('%H:%M')}"
        day_name = DAY_NAMES_ES.get(slot["weekday"], "")
        header_time.append(Paragraph(f"<b>{time_str}</b><br/>{day_name.upper()}", header_style))

        cart_label = slot["cart_name"]
        if slot["cart_location"]:
            cart_label = f"{cart_label}<br/>{slot['cart_location']}"
        header_cart.append(Paragraph(f"<b>{cart_label}</b>", header_style))

    data = [header_time, header_cart]
    row_types = ["header_time", "header_cart"]

    # Weeks
    year = int(year_str)
    month_num = int(month_str)
    for week_start in _week_starts_for_month(year, month_num):
        # Date row
        date_row = []
        for slot in slot_list:
            day_date = week_start + timedelta(days=slot["weekday"])
            if day_date.month != month_num:
                date_row.append("")
                continue
            day_name = DAY_NAMES_ES.get(day_date.weekday(), "")
            date_row.append(Paragraph(f"<b>{day_name.upper()} {day_date.day}</b>", cell_style))
        data.append(date_row)
        row_types.append("date")

        # Assignment rows
        week_sessions = []
        max_names = 0
        for slot in slot_list:
            day_date = week_start + timedelta(days=slot["weekday"])
            key = (slot["weekday"], slot["start_time"], slot["end_time"], slot["cart_id"])
            sess = session_map.get((key, day_date))
            if not sess:
                week_sessions.append([])
                continue

            assignments = list(sess.assignments or [])
            # captain first
            assignments.sort(key=lambda a: (not a.is_captain, a.user.firstname if a.user else "", a.user.lastname if a.user else ""))
            names = []
            for a in assignments:
                if not a.user:
                    continue
                name = f"{a.user.firstname} {a.user.lastname}"
                names.append((name, a.is_captain))
            week_sessions.append(names)
            max_names = max(max_names, len(names))

        if max_names == 0:
            # Add empty row for spacing
            data.append([""] * len(slot_list))
            row_types.append("empty")
        else:
            for idx in range(max_names):
                row = []
                for names in week_sessions:
                    if idx < len(names):
                        name, is_captain = names[idx]
                        row.append(Paragraph(name, captain_style if is_captain else cell_style))
                    else:
                        row.append("")
                data.append(row)
                row_types.append("names")

    # Column widths
    col_width = doc.width / max(len(slot_list), 1)
    col_widths = [col_width for _ in slot_list]

    table = Table(data, colWidths=col_widths, repeatRows=2)

    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#9CA3AF")),
    ]

    # Header styles
    style_cmds.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")))
    style_cmds.append(("FONTSIZE", (0, 0), (-1, 0), 8))
    style_cmds.append(("FONTSIZE", (0, 1), (-1, 1), 8))

    # Cart color row
    for col, slot in enumerate(slot_list):
        style_cmds.append(("BACKGROUND", (col, 1), (col, 1), _hex_color(slot["cart_color"])))

    # Date row shading
    for i, rtype in enumerate(row_types):
        if rtype == "date":
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FEF3C7")))
            style_cmds.append(("FONTSIZE", (0, i), (-1, i), 7))
        elif rtype == "names":
            style_cmds.append(("FONTSIZE", (0, i), (-1, i), 7))
        elif rtype == "empty":
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F9FAFB")))

    table.setStyle(TableStyle(style_cmds))
    elements.append(table)

    # Legend
    legend_rows = []
    for slot in slot_list:
        name = slot["cart_name"]
        if name not in [r[1] for r in legend_rows]:
            legend_rows.append([_hex_color(slot["cart_color"]), name])

    if legend_rows:
        elements.append(Spacer(1, 4 * mm))
        legend_data = [[Paragraph("<b>Lugares por colores</b>", styles["Normal"]), ""]]
        for color_val, name in legend_rows:
            legend_data.append(["", Paragraph(name, styles["Normal"])])

        legend = Table(legend_data, colWidths=[12 * mm, 60 * mm])
        legend_style = TableStyle([
            ("GRID", (0, 1), (-1, -1), 0.2, colors.HexColor("#E5E7EB")),
            ("SPAN", (0, 0), (-1, 0)),
            ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ])
        # Apply color squares
        for idx, (color_val, _) in enumerate(legend_rows, start=1):
            legend_style.add("BACKGROUND", (0, idx), (0, idx), color_val)
        legend.setStyle(legend_style)
        elements.append(legend)

    doc.build(elements)
    buffer.seek(0)
    return buffer
