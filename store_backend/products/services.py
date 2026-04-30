from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
import requests
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import MTGCard, PricingSettings, Product, PricingSource

SCRYFALL_BASE = "https://api.scryfall.com"
SCRYFALL_TIMEOUT = 20


class ScryfallServiceError(Exception):
    pass


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
    return {
        "name": card_data.get("name", ""),
        "printed_name": card_data.get("printed_name", ""),
        "set_name": card_data.get("set_name", ""),
        "set_code": card_data.get("set", ""),
        "collector_number": card_data.get("collector_number", ""),
        "rarity": card_data.get("rarity", ""),
        "mana_cost": card_data.get("mana_cost", ""),
        "type_line": card_data.get("type_line", ""),
        "oracle_text": card_data.get("oracle_text", ""),
        "colors": card_data.get("colors") or [],
        "color_identity": card_data.get("color_identity") or [],
        "image_small": image_uris.get("small", ""),
        "image_normal": image_uris.get("normal", ""),
        "image_large": image_uris.get("large", ""),
        "scryfall_uri": card_data.get("scryfall_uri", ""),
        "released_at": date.fromisoformat(released) if released else None,
        "raw_data": card_data,
    }


def _to_decimal(value, fallback=Decimal("0")):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        return fallback


def get_active_pricing_settings():
    settings = PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first()
    if settings:
        return settings
    return PricingSettings(
        usd_to_clp=Decimal("1000"),
        import_factor=Decimal("1.30"),
        risk_factor=Decimal("1.10"),
        margin_factor=Decimal("1.25"),
        round_to=100,
    )


def calculate_price_clp(usd_price, is_foil=False):
    usd = _to_decimal(usd_price)
    settings = get_active_pricing_settings()
    raw_clp = usd * settings.usd_to_clp * settings.import_factor * settings.risk_factor * settings.margin_factor
    round_to = max(int(settings.round_to or 100), 1)
    suggested = int((raw_clp / Decimal(round_to)).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal(round_to)) if raw_clp > 0 else 0

    return {
        "usd": float(usd),
        "is_foil": is_foil,
        "clp_sugerido": suggested,
        "detalle": {
            "tipo_cambio": float(settings.usd_to_clp),
            "factor_importacion": float(settings.import_factor),
            "factor_riesgo": float(settings.risk_factor),
            "margen": float(settings.margin_factor),
            "round_to": round_to,
        },
    }


def extract_usd_price(card_data, is_foil=False):
    prices = card_data.get("prices") or {}
    key = "usd_foil" if is_foil else "usd"
    usd = _to_decimal(prices.get(key), fallback=Decimal("0"))
    return usd


def search_cards(query):
    payload = _request_json("/cards/search", params={"q": query})
    return payload.get("data", [])


def get_card_by_id(scryfall_id):
    return _request_json(f"/cards/{scryfall_id}")


def get_scryfall_card_by_id(scryfall_id):
    url = f"{SCRYFALL_BASE}/cards/{scryfall_id}"
    response = requests.get(url, timeout=10)
    if response.status_code != 200:
        raise ValidationError(f"Scryfall no encontró la carta: {response.text}")
    return response.json()


def import_card(scryfall_id):
    card_data = get_card_by_id(scryfall_id)
    card, _ = MTGCard.objects.update_or_create(
        scryfall_id=card_data["id"],
        defaults=_normalize_card_data(card_data),
    )
    return card, card_data


def create_or_update_single_product(card: MTGCard, payload):
    edition = payload.get("edition") or card.set_name
    existing = Product.objects.filter(
        mtg_card=card,
        condition=payload.get("condition", Product.CardCondition.NM),
        language=payload.get("language", "EN"),
        is_foil=payload.get("is_foil", False),
        edition=edition,
    ).first()

    common_data = {
        "category": payload.get("category"),
        "product_type": Product.ProductType.SINGLE,
        "price_clp": payload["price_clp_final"],
        "price": payload["price_clp_final"],
        "price_usd_reference": payload.get("price_usd_reference", 0),
        "price_clp_suggested": payload.get("price_clp_suggested", 0),
        "price_clp_final": payload["price_clp_final"],
        "pricing_source": PricingSource.SCRYFALL,
        "pricing_last_update": timezone.now(),
        "stock": payload["stock"],
        "condition": payload.get("condition", Product.CardCondition.NM),
        "language": payload.get("language", "EN"),
        "is_foil": payload.get("is_foil", False),
        "edition": edition,
        "notes": payload.get("notes", ""),
        "is_active": payload.get("is_active", True),
        "image": card.image_large or card.image_normal or card.image_small,
        "description": f"{card.type_line}\nRareza: {card.rarity}\nSet: {card.set_name} ({card.set_code.upper()})\n\n{card.oracle_text}",
    }

    if existing:
        previous_stock = existing.stock
        for key, value in common_data.items():
            setattr(existing, key, value)
        existing.stock = previous_stock + payload["stock"]
        existing.save()
        return existing, False

    product = Product.objects.create(
        mtg_card=card,
        name=f"{card.name} - {card.set_code.upper()} {card.collector_number}".strip(),
        **common_data,
    )
    return product, True
