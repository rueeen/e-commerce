from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import json
import logging
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
import requests
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from openpyxl import load_workbook

from .models import BundleItem, MTGCard, PricingSettings, Product, PurchaseOrder, PurchaseOrderItem, SealedProduct, SingleCard, Supplier

SCRYFALL_BASE = "https://api.scryfall.com"
SCRYFALL_TIMEOUT = 20
logger = logging.getLogger(__name__)


COLUMN_ALIASES = {
    "name": ["name", "nombre"],
    "type": ["type", "tipo"],
    "price_clp": ["price_clp", "precio", "price"],
}


def _normalize_header(value):
    return str(value or "").strip().lower().replace(" ", "_")


def _resolve_catalog_headers(raw_headers):
    normalized_headers = [_normalize_header(h) for h in raw_headers]
    logger.info("Headers recibidos en importación catálogo XLSX: %s", normalized_headers)

    alias_to_canonical = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            alias_to_canonical[_normalize_header(alias)] = canonical

    header_map = {}
    for header in normalized_headers:
        canonical = alias_to_canonical.get(header, header)
        if canonical not in header_map:
            header_map[canonical] = header

    expected = ["name", "type", "price_clp"]
    missing = [column for column in expected if column not in header_map]
    if missing:
        raise ValidationError({
            "detail": "Columnas inválidas",
            "expected": expected,
            "received": normalized_headers,
        })

    return normalized_headers, header_map

class ScryfallServiceError(Exception):
    pass

# ... keep existing helpers

def _request_json(path, params=None):
    query = f"?{urlencode(params)}" if params else ""
    url = f"{SCRYFALL_BASE}{path}{query}"
    try:
        with urlopen(url, timeout=SCRYFALL_TIMEOUT) as response:
            payload = response.read().decode()
    except HTTPError as exc:
        if exc.code == 404:
            raise ScryfallServiceError("Carta no encontrada en Scryfall") from exc
        raise ScryfallServiceError(f"Error Scryfall ({exc.code})") from exc
    except URLError as exc:
        raise ScryfallServiceError("Error de red consultando Scryfall") from exc
    try:
        return json.loads(payload)
    except ValueError as exc:
        raise ScryfallServiceError("Respuesta inválida desde Scryfall") from exc

def _image_uris(card_data):
    image_uris = card_data.get("image_uris") or {}
    if image_uris:
        return image_uris
    for face in card_data.get("card_faces") or []:
        if face.get("image_uris"):
            return face["image_uris"]
    return {}

def _normalize_card_data(card_data):
    image_uris = _image_uris(card_data)
    released = card_data.get("released_at")
    return {"name": card_data.get("name", ""), "printed_name": card_data.get("printed_name", ""), "set_name": card_data.get("set_name", ""), "set_code": card_data.get("set", ""), "collector_number": card_data.get("collector_number", ""), "rarity": card_data.get("rarity", ""), "mana_cost": card_data.get("mana_cost", ""), "type_line": card_data.get("type_line", ""), "oracle_text": card_data.get("oracle_text", ""), "colors": card_data.get("colors") or [], "color_identity": card_data.get("color_identity") or [], "image_small": image_uris.get("small", ""), "image_normal": image_uris.get("normal", ""), "image_large": image_uris.get("large", ""), "scryfall_uri": card_data.get("scryfall_uri", ""), "released_at": date.fromisoformat(released) if released else None, "raw_data": card_data}

def _to_decimal(value, fallback=Decimal("0")):
    try: return Decimal(str(value))
    except (InvalidOperation, TypeError): return fallback

def _to_int(value, default=0):
    try:
        if value in (None, ""):
            return default
        return int(float(value))
    except (TypeError, ValueError):
        raise ValidationError("Valor numérico inválido")

def _to_bool(value, default=False):
    if value is None: return default
    if isinstance(value, bool): return value
    return str(value).strip().lower() in {"true","1","yes","on","si"}

def get_active_pricing_settings():
    settings = PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first()
    if settings: return settings
    return PricingSettings(usd_to_clp=Decimal("1000"), import_factor=Decimal("1.30"), risk_factor=Decimal("1.10"), margin_factor=Decimal("1.25"), rounding_to=100)

def extract_usd_price(card_data, is_foil=False):
    prices = card_data.get("prices") or {}
    return _to_decimal(prices.get("usd_foil" if is_foil else "usd"), fallback=Decimal("0"))

def search_cards(query): return _request_json("/cards/search", params={"q": query}).get("data", [])
def get_card_by_id(scryfall_id): return _request_json(f"/cards/{scryfall_id}")
def get_scryfall_card_by_id(scryfall_id):
    response = requests.get(f"{SCRYFALL_BASE}/cards/{scryfall_id}", timeout=10)
    if response.status_code != 200: raise ValidationError(f"Scryfall no encontró la carta: {response.text}")
    return response.json()

def import_card(scryfall_id):
    card_data = get_card_by_id(scryfall_id)
    card, _ = MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=_normalize_card_data(card_data))
    return card, card_data

def resolve_scryfall_card(*, scryfall_id=None, name=None):
    if scryfall_id:
        card_data = get_card_by_id(str(scryfall_id).strip())
        card, _ = MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=_normalize_card_data(card_data))
        return card, card_data, []
    normalized_name = " ".join(str(name or "").replace("\n", " ").split()).strip()
    if not normalized_name:
        raise ValidationError("name es obligatorio para single")
    cards = search_cards(f'!"{normalized_name}"')
    if len(cards) > 1:
        raise ValidationError("Single ambiguo sin scryfall_id: más de una coincidencia")
    if len(cards) == 0:
        raise ValidationError("No se encontró carta en Scryfall por nombre")
    card_data = cards[0]
    card, _ = MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=_normalize_card_data(card_data))
    return card, card_data, ["single sin scryfall_id: se resolvió por nombre"]

def import_single_catalog_row(row_data):
    card, card_data, warnings = resolve_scryfall_card(scryfall_id=row_data.get("scryfall_id"), name=row_data.get("name"))
    name = str(row_data.get("name") or card.name).strip()
    product, created = Product.objects.update_or_create(
        name=name, product_type=Product.ProductType.SINGLE,
        defaults={"category": row_data.get("category"), "description": str(row_data.get("description") or card.type_line or ""), "price_clp": _to_int(row_data.get("price_clp"), 0), "image": str(row_data.get("image") or card.image_large or card.image_normal or card.image_small or ""), "notes": str(row_data.get("notes") or ""), "is_active": _to_bool(row_data.get("is_active"), True)},
    )
    SingleCard.objects.update_or_create(product=product, defaults={"mtg_card": card, "condition": str(row_data.get("condition") or Product.CardCondition.NM).upper(), "language": str(row_data.get("language") or "EN").upper(), "is_foil": _to_bool(row_data.get("is_foil"), False), "edition": row_data.get("set_name") or card.set_name, "price_usd_reference": extract_usd_price(card_data, _to_bool(row_data.get("is_foil"), False))})
    return product, created, warnings

def import_sealed_catalog_row(row_data):
    sealed_kind = str(row_data.get("sealed_kind") or "").strip().lower()
    if not sealed_kind:
        raise ValidationError("sealed_kind es obligatorio para type=sealed")
    product, created = Product.objects.update_or_create(name=str(row_data.get("name") or "").strip(), product_type=Product.ProductType.SEALED, defaults={"category": row_data.get("category"), "description": str(row_data.get("description") or ""), "price_clp": _to_int(row_data.get("price_clp"), 0), "image": str(row_data.get("image") or ""), "notes": str(row_data.get("notes") or ""), "is_active": _to_bool(row_data.get("is_active"), True)})
    SealedProduct.objects.update_or_create(product=product, defaults={"sealed_kind": sealed_kind, "set_code": str(row_data.get("set_code") or "")})
    return product, created, []

def import_catalog_row(row_data):
    row_type = str(row_data.get("type") or "").strip().lower()
    if not row_type: raise ValidationError("type es obligatorio")
    if not str(row_data.get("name") or "").strip(): raise ValidationError("name es obligatorio")
    price = _to_int(row_data.get("price_clp"), 0)
    if price < 0: raise ValidationError("price_clp debe ser entero >= 0")
    if row_type == Product.ProductType.SINGLE:
        return import_single_catalog_row(row_data)
    if row_type == Product.ProductType.SEALED:
        return import_sealed_catalog_row(row_data)
    if row_type == Product.ProductType.BUNDLE:
        product, created = Product.objects.update_or_create(name=str(row_data.get("name")).strip(), product_type=Product.ProductType.BUNDLE, defaults={"category": row_data.get("category"), "description": str(row_data.get("description") or ""), "price_clp": price, "image": str(row_data.get("image") or ""), "notes": str(row_data.get("notes") or ""), "is_active": _to_bool(row_data.get("is_active"), True)})
        return product, created, []
    raise ValidationError("type inválido. Usa single, sealed o bundle")

def import_catalog_from_xlsx(excel_file):
    workbook = load_workbook(excel_file, data_only=True)
    sheet = workbook["catalog"] if "catalog" in workbook.sheetnames else workbook.active
    raw_headers = [c.value for c in next(sheet.iter_rows(min_row=1, max_row=1))]
    normalized_headers, header_map = _resolve_catalog_headers(raw_headers)
    summary = {"created": 0, "updated": 0, "errors": [], "warnings": [], "preview": []}
    categories = {c.name.strip().lower(): c for c in Product._meta.get_field('category').related_model.objects.all()}
    initial_stock = {p.id: p.stock for p in Product.objects.all()}
    for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        source_row_data = dict(zip(normalized_headers, row))
        row_data = {canonical: source_row_data.get(source_header) for canonical, source_header in header_map.items()}
        row_data["category"] = categories.get(str(row_data.get("category") or "").strip().lower())
        try:
            logger.info("Procesando fila %s", row_num)
            product, created, warns = import_catalog_row(row_data)
            summary["created" if created else "updated"] += 1
            summary["warnings"].extend([{"row": row_num, "warning": w} for w in warns])
            summary["preview"].append({"row": row_num, "product_id": product.id, "status": "ok"})
        except Exception as exc:
            logger.error("Error fila %s: %s", row_num, exc)
            summary["errors"].append({"row": row_num, "error": str(exc)})
            summary["preview"].append({"row": row_num, "status": "error"})
    for p in Product.objects.filter(id__in=initial_stock.keys()):
        if p.stock != initial_stock[p.id]:
            raise ValidationError("La importación de catálogo no puede modificar stock")
    return summary


def _get_xlsx_sheet(workbook, preferred_sheet=None):
    if preferred_sheet and preferred_sheet in workbook.sheetnames:
        return workbook[preferred_sheet]
    return workbook.active


def _sheet_headers(sheet):
    first_row = next(sheet.iter_rows(min_row=1, max_row=1), None)
    if not first_row:
        raise ValidationError("El archivo XLSX está vacío")
    headers = [str(c.value or "").strip().lower() for c in first_row]
    if not any(headers):
        raise ValidationError("El archivo XLSX no tiene encabezados válidos")
    return headers

def import_purchase_order_from_xlsx(*, excel_file, user, purchase_order_id=None):
    workbook = load_workbook(excel_file, data_only=True)
    sheet = _get_xlsx_sheet(workbook, preferred_sheet="purchase_orders")
    headers = _sheet_headers(sheet)
    required = {"quantity", "supplier", "order_number"}
    if not required.issubset(set(headers)): raise ValidationError("Columnas inválidas para importación de compra")
    first_row = next(sheet.iter_rows(min_row=2, max_row=2, values_only=True), None)
    if not first_row:
        raise ValidationError("El XLSX no contiene filas de detalle")
    first = dict(zip(headers, first_row))
    supplier, _ = Supplier.objects.get_or_create(name=str(first.get("supplier") or "Proveedor XLSX").strip())
    with transaction.atomic():
        po = PurchaseOrder.objects.filter(pk=purchase_order_id).first() if purchase_order_id else None
        if not po:
            po = PurchaseOrder.objects.create(supplier=supplier, order_number=str(first.get("order_number") or f"XLSX-{timezone.now().timestamp()}"), created_by=user, status=PurchaseOrder.Status.DRAFT, exchange_rate=_to_decimal(first.get("exchange_rate"), Decimal("0")))
        summary = {"rows_processed": 0, "errors": [], "preview": []}
        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            r = dict(zip(headers, row)); summary["rows_processed"] += 1
            try:
                qty = _to_int(r.get("quantity"), 0)
                if qty <= 0: raise ValidationError("quantity debe ser entero > 0")
                product = Product.objects.filter(pk=r.get("product_id")).first()
                if not product and r.get("name"):
                    product = Product.objects.filter(name=str(r.get("name")).strip()).first()
                if not product: raise ValidationError("No se pudo resolver product_id/name")
                unit_cost_clp = _to_int(r.get("unit_cost_clp"), 0)
                unit_cost_usd = _to_decimal(r.get("unit_cost_usd"), Decimal("0"))
                PurchaseOrderItem.objects.create(purchase_order=po, product=product, quantity_ordered=qty, quantity_received=0, unit_cost_usd=unit_cost_usd, unit_cost_clp=unit_cost_clp, subtotal_clp=qty * unit_cost_clp)
                summary["preview"].append({"row": row_num, "status": "ok", "product_id": product.id})
            except Exception as exc:
                summary["errors"].append({"row": row_num, "error": str(exc)})
                summary["preview"].append({"row": row_num, "status": "error"})
    return po, summary

def calculate_price_clp(usd_price, is_foil=False):
    usd = _to_decimal(usd_price)
    settings = get_active_pricing_settings()
    raw_clp = usd * settings.usd_to_clp
    return {"usd": float(usd), "is_foil": is_foil, "clp_sugerido": int(raw_clp)}


def calculate_suggested_sale_price(product, unit_cost_clp=None):
    unit_cost = int(unit_cost_clp or 0)
    return {"suggested_price_clp": max(unit_cost, int(product.price_clp or 0)), "min_price_clp": unit_cost, "source": "MANUAL"}
