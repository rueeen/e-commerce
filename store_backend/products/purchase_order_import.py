import re
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from openpyxl import load_workbook

from .scryfall_normalizer import normalize_card_description

D = Decimal
SECTION_MAP = {"NM": "NM", "EX": "EX", "VG": "VG"}
TOLERANCE = D("0.02")


def _to_decimal(value):
    if value is None:
        return D("0")
    text = str(value).strip().replace(",", "")
    text = re.sub(r"[^0-9.\-]", "", text)
    if not text:
        return D("0")
    try:
        return D(text)
    except InvalidOperation as exc:
        raise ValidationError(f"Valor numérico inválido: {value}") from exc


def _fmt(v):
    return f"{D(v).quantize(D('0.01'))}"


def _parse_section(first_col):
    text = str(first_col or "").strip().upper()
    for key, value in SECTION_MAP.items():
        if text == key or text.startswith(f"{key} "):
            return value
    return None


def _extract_currency(total_value):
    text = str(total_value or "")
    m = re.search(r"\b([A-Z]{3})\b", text)
    return m.group(1) if m else None


def _is_header_row(row):
    cells = [str(c or "").strip().lower() for c in row[:5]]
    return cells[:5] == ["description", "style", "qty", "price", "total"]


def _parse_normalized_workbook(wb):
    if "purchase_order" not in wb.sheetnames or "purchase_order_items" not in wb.sheetnames:
        return None
    po_sheet = wb["purchase_order"]
    fields = {}
    for row in po_sheet.iter_rows(min_row=2, values_only=True):
        key, value = row[0], row[1] if len(row) > 1 else None
        if key:
            fields[str(key).strip().lower()] = value
    totals = {
        "subtotal_original": _to_decimal(fields.get("subtotal_original")),
        "shipping_original": _to_decimal(fields.get("shipping_original")),
        "sales_tax_original": _to_decimal(fields.get("sales_tax_original")),
        "total_original": _to_decimal(fields.get("total_original")),
    }
    currency = (str(fields.get("currency") or "").strip().upper() or "CLP")
    items = []
    sheet = wb["purchase_order_items"]
    headers = [str(c.value or "").strip().lower() for c in next(sheet.iter_rows(min_row=1, max_row=1))]
    idx = {h: i for i, h in enumerate(headers)}
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        raw = str(row[idx.get("raw_description", 0)] or "").strip()
        norm = str(row[idx.get("normalized_name", 1)] or "").strip()
        set_name = str(row[idx.get("set_name", 2)] or "").strip()
        condition = str(row[idx.get("condition", 3)] or "NM").strip().upper()
        qty = int(_to_decimal(row[idx.get("qty", 4)]))
        unit = _to_decimal(row[idx.get("unit_price_original", 5)])
        total = _to_decimal(row[idx.get("total_original", 6)])
        foil = str(row[idx.get("foil", 8)] or "").strip().lower() in {"1", "true", "yes"}
        language = str(row[idx.get("language", 9)] or "EN").strip().upper() or "EN"
        if not norm and raw:
            n = normalize_card_description(raw)
            norm, set_name, foil = n["normalized_card_name"], set_name or n["set_name_detected"], foil or n["is_foil_detected"]
        items.append({"raw_description": raw, "normalized_card_name": norm, "set_name_detected": set_name, "style_condition": condition,
                      "quantity_ordered": qty, "unit_price_original": _fmt(unit), "line_total_original": _fmt(total), "is_foil_detected": foil,
                      "language": language, "scryfall_status": "pending"})
    return {"currency": currency, "totals": {k: _fmt(v) for k, v in totals.items()}, "items": items, "errors": [], "warnings": []}


def parse_purchase_order_excel(file, fallback_currency="CLP"):
    wb = load_workbook(file, data_only=True)
    normalized = _parse_normalized_workbook(wb)
    if normalized:
        return normalized
    sheet = wb.active
    condition = "NM"
    currency = (fallback_currency or "CLP").upper()
    items, warnings, errors = [], [], []
    totals = {"subtotal_original": D("0"), "shipping_original": D("0"), "sales_tax_original": D("0"), "total_original": D("0")}

    for i, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        if not any(row):
            continue
        first = str(row[0] or "").strip()
        if not first:
            continue
        sec = _parse_section(first)
        if sec:
            condition = sec
            continue
        if _is_header_row(row) or first.lower() == "description":
            continue
        key = first.strip().lower()
        if key in {"subtotal", "shipping", "sales tax", "total"}:
            raw_total = row[4] if len(row) > 4 else (row[1] if len(row) > 1 else 0)
            if key == "total":
                detected = _extract_currency(raw_total)
                if detected:
                    currency = detected
            totals[f"{key.replace(' ', '_')}_original"] = _to_decimal(raw_total)
            continue

        description = first
        qty = int(_to_decimal(row[2] if len(row) > 2 else 0))
        unit = _to_decimal(row[3] if len(row) > 3 else 0)
        total = _to_decimal(row[4] if len(row) > 4 else 0)
        style = str(row[1] or "").strip().upper() or condition
        normalized = normalize_card_description(description)
        items.append({"raw_description": description, "normalized_card_name": normalized["normalized_card_name"], "set_name_detected": normalized["set_name_detected"],
                      "style_condition": style, "quantity_ordered": qty, "unit_price_original": _fmt(unit), "line_total_original": _fmt(total),
                      "is_foil_detected": normalized["is_foil_detected"], "language": "EN", "scryfall_status": "pending"})
        if qty <= 0:
            errors.append({"row": i, "error": "quantity_ordered debe ser > 0"})

    calc_subtotal = sum((D(it["line_total_original"]) for it in items), D("0"))
    if abs(calc_subtotal - totals["subtotal_original"]) > TOLERANCE:
        warnings.append(f"Diferencia subtotal: items={calc_subtotal} subtotal={totals['subtotal_original']}")
    calc_total = totals["subtotal_original"] + totals["shipping_original"] + totals["sales_tax_original"]
    if abs(calc_total - totals["total_original"]) > TOLERANCE:
        warnings.append(f"Diferencia total: calculado={calc_total} total={totals['total_original']}")

    return {"currency": currency, "totals": {k: _fmt(v) for k, v in totals.items()}, "items": items, "errors": errors, "warnings": warnings}
