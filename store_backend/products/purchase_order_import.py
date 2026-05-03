import re
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from openpyxl import load_workbook

from .scryfall_service import search_scryfall_card

D = Decimal
SECTION_MAP = {"NM": "NM", "EX": "EX", "VG": "VG"}
REMOVE_TOKENS = ["Foil", "Commander Decks", "Variants", "Showcase", "Extended Art"]


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


def normalize_card_name(raw_description):
    text = str(raw_description or "").strip()
    base = text.rsplit(":", 1)[-1].strip()
    base = re.sub(r"\([^)]*\)", "", base)
    for token in REMOVE_TOKENS:
        base = re.sub(rf"\b{re.escape(token)}\b", "", base, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", base).strip(" -:")


def detect_foil(raw_description):
    return "foil" in str(raw_description or "").lower()


def detect_set(raw_description):
    text = str(raw_description or "").strip()
    if ":" not in text:
        return ""
    return text.rsplit(":", 1)[0].strip()


def convert_to_clp(amount, exchange_rate):
    rate = _to_decimal(exchange_rate)
    if rate <= 0:
        raise ValidationError("exchange_rate debe ser mayor a 0 para USD")
    return int((_to_decimal(amount) * rate).quantize(D("1")))


def _parse_section(row_first_col):
    text = str(row_first_col or "").strip().upper()
    for key in SECTION_MAP:
        if text.startswith(f"{key} ") or text == key:
            return SECTION_MAP[key]
    return None


def parse_purchase_order_excel(file):
    wb = load_workbook(file, data_only=True)
    sheet = wb.active
    condition = "NM"
    currency = "CLP"
    items = []
    totals = {"subtotal": D("0"), "shipping": D("0"), "sales_tax": D("0"), "total": D("0")}
    errors = []

    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        if not any(row):
            continue
        first = str(row[0] or "").strip()
        sec = _parse_section(first)
        if sec:
            condition = sec
            continue
        lower_first = first.lower()
        if lower_first in {"description", ""}:
            continue
        if lower_first in {"subtotal", "shipping", "sales tax", "total"}:
            totals[lower_first.replace(" ", "_")] = _to_decimal(row[4] if len(row) > 4 else row[1])
            continue

        description = str(row[0] or "").strip()
        if not description:
            continue
        qty = int(_to_decimal(row[2] if len(row) > 2 else 0))
        price = _to_decimal(row[3] if len(row) > 3 else 0)
        line_total = _to_decimal(row[4] if len(row) > 4 else 0)
        if "$" in "".join(str(c or "") for c in row):
            currency = "USD"
        item = {
            "raw_description": description,
            "normalized_name": normalize_card_name(description),
            "condition": condition,
            "qty": qty,
            "unit_price_original": price,
            "total_original": line_total,
            "currency": currency,
            "foil": detect_foil(description),
            "set_name_detected": detect_set(description),
            "language": "EN",
        }
        if qty <= 0:
            errors.append({"row": row_idx, "error": "qty debe ser > 0"})
        if price < 0:
            errors.append({"row": row_idx, "error": "price debe ser >= 0"})
        items.append(item)

    calc_subtotal = sum((i["total_original"] for i in items), D("0"))
    if totals["subtotal"] and calc_subtotal != totals["subtotal"]:
        errors.append({"error": f"Subtotal inconsistente. items={calc_subtotal} subtotal={totals['subtotal']}"})
    if totals["total"] and totals["subtotal"] and (totals["subtotal"] + totals["shipping"] + totals["sales_tax"] != totals["total"]):
        errors.append({"error": "Total inconsistente"})

    for item in items:
        result = search_scryfall_card(item["normalized_name"], item["set_name_detected"])
        if not result:
            result = search_scryfall_card(item["normalized_name"], None)
        if result:
            item.update({
                "scryfall_id": result.get("scryfall_id", ""),
                "scryfall_name": result.get("name", ""),
                "scryfall_set": result.get("set_name", ""),
                "scryfall_image_large": result.get("image_large", ""),
                "scryfall_pending": False,
            })
        else:
            item.update({"scryfall_pending": True})

    return {"currency": currency, "items": items, "totals": totals, "errors": errors}
