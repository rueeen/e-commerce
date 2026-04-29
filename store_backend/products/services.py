from decimal import Decimal, InvalidOperation
from datetime import date

import json
from urllib.parse import urlencode
from urllib.request import urlopen
from django.db import transaction

from .models import MTGCard, Product

SCRYFALL_BASE = "https://api.scryfall.com"


def _to_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def upsert_card(card_data):
    image_uris = card_data.get("image_uris") or {}
    released = card_data.get("released_at")
    defaults = {
        "name": card_data.get("name", ""),
        "set_name": card_data.get("set_name", ""),
        "set_code": card_data.get("set", ""),
        "collector_number": card_data.get("collector_number", ""),
        "rarity": card_data.get("rarity", ""),
        "mana_cost": card_data.get("mana_cost", ""),
        "type_line": card_data.get("type_line", ""),
        "oracle_text": card_data.get("oracle_text", ""),
        "colors": card_data.get("colors") or [],
        "color_identity": card_data.get("color_identity") or [],
        "legalities": card_data.get("legalities") or {},
        "image_normal": image_uris.get("normal", ""),
        "image_small": image_uris.get("small", ""),
        "price_usd": _to_decimal((card_data.get("prices") or {}).get("usd")),
        "price_eur": _to_decimal((card_data.get("prices") or {}).get("eur")),
        "released_at": date.fromisoformat(released) if released else None,
        "raw_data": card_data,
    }
    card, _ = MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=defaults)
    return card


def search_cards(name):
    qs = urlencode({"q": name})
    with urlopen(f"{SCRYFALL_BASE}/cards/search?{qs}", timeout=30) as resp:
        return json.loads(resp.read().decode())


def import_card(scryfall_id):
    with urlopen(f"{SCRYFALL_BASE}/cards/{scryfall_id}", timeout=30) as resp:
        return upsert_card(json.loads(resp.read().decode()))


def import_set(set_code, limit=250):
    url = f"{SCRYFALL_BASE}/cards/search"
    params = {"q": f"set:{set_code}", "unique": "prints"}
    imported = 0
    while url and imported < limit:
        if params and "?" not in url:
            url = f"{url}?{urlencode(params)}"
        with urlopen(url, timeout=45) as resp:
            payload = json.loads(resp.read().decode())
        params = None
        for card_data in payload.get("data", []):
            upsert_card(card_data)
            imported += 1
            if imported >= limit:
                break
        url = payload.get("next_page") if payload.get("has_more") else None
    return imported


def sync_bulk_data(max_cards=5000):
    with urlopen(f"{SCRYFALL_BASE}/bulk-data", timeout=30) as bulk:
        entries = json.loads(bulk.read().decode()).get("data", [])
    target = next((x for x in entries if x.get("type") == "default_cards"), None)
    if not target:
        raise ValueError("No se encontró bulk data default_cards")
    with urlopen(target["download_uri"], timeout=120) as data_resp:
        cards_payload = json.loads(data_resp.read().decode())
    imported = 0
    with transaction.atomic():
        for card_data in cards_payload:
            upsert_card(card_data)
            imported += 1
            if imported >= max_cards:
                break
    return {"imported": imported, "source": target.get("name")}


def create_product_from_card(card: MTGCard, defaults=None):
    defaults = defaults or {}
    product_defaults = {
        "description": card.oracle_text,
        "product_type": Product.ProductType.SINGLE,
        "price": card.price_usd or Decimal("0"),
        "price_clp": defaults.get("price_clp", 0),
        "stock": defaults.get("stock", 0),
        "image": card.image_normal,
        "condition": defaults.get("condition", Product.CardCondition.NM),
        "language": defaults.get("language", "EN"),
        "is_foil": defaults.get("is_foil", False),
        "edition": defaults.get("edition", card.set_name),
        "notes": defaults.get("notes", ""),
        "is_active": True,
    }
    product, _ = Product.objects.update_or_create(name=card.name, mtg_card=card, defaults=product_defaults)
    return product
