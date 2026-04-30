from datetime import date

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen
from django.db import transaction

from .models import MTGCard, Product

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


def search_cards(query):
    payload = _request_json("/cards/search", params={"q": query})
    return payload.get("data", [])


def get_card_by_id(scryfall_id):
    return _request_json(f"/cards/{scryfall_id}")


def get_card_named(name):
    return _request_json("/cards/named", params={"fuzzy": name})


def import_card(scryfall_id):
    card_data = get_card_by_id(scryfall_id)
    card, _ = MTGCard.objects.update_or_create(
        scryfall_id=card_data["id"],
        defaults=_normalize_card_data(card_data),
    )
    return card


def import_set(set_code, limit=250):
    url = f"{SCRYFALL_BASE}/cards/search"
    params = {"q": f"set:{set_code}", "unique": "prints"}
    imported = 0
    while url and imported < limit:
        target_url = f"{url}?{urlencode(params)}" if params and "?" not in url else url
        with urlopen(target_url, timeout=SCRYFALL_TIMEOUT) as response:
            payload = json.loads(response.read().decode())
        params = None
        for card_data in payload.get("data", []):
            MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=_normalize_card_data(card_data))
            imported += 1
            if imported >= limit:
                break
        url = payload.get("next_page") if payload.get("has_more") else None
    return imported


def sync_bulk_data(max_cards=5000):
    with transaction.atomic():
        with urlopen(f"{SCRYFALL_BASE}/bulk-data", timeout=SCRYFALL_TIMEOUT) as response:
            entries = json.loads(response.read().decode()).get("data", [])
        target = next((x for x in entries if x.get("type") == "default_cards"), None)
        if not target:
            raise ScryfallServiceError("No se encontró bulk data default_cards")

        with urlopen(target["download_uri"], timeout=60) as data_response:
            cards_payload = json.loads(data_response.read().decode())
        imported = 0
        for card_data in cards_payload:
            MTGCard.objects.update_or_create(scryfall_id=card_data["id"], defaults=_normalize_card_data(card_data))
            imported += 1
            if imported >= max_cards:
                break
    return {"imported": imported, "source": target.get("name")}


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
        "price_clp": payload["price_clp"],
        "price": payload["price_clp"],
        "stock": payload["stock"],
        "condition": payload.get("condition", Product.CardCondition.NM),
        "language": payload.get("language", "EN"),
        "is_foil": payload.get("is_foil", False),
        "edition": edition,
        "notes": payload.get("notes", ""),
        "is_active": payload.get("is_active", True),
        "image": card.image_normal or card.image_small,
        "description": f"{card.type_line}\nRareza: {card.rarity}\nSet: {card.set_name} ({card.set_code.upper()})\n\n{card.oracle_text}",
    }

    if existing:
        for key, value in common_data.items():
            setattr(existing, key, value)
        existing.stock = existing.stock + payload["stock"]
        existing.save()
        return existing, False

    product = Product.objects.create(
        mtg_card=card,
        name=f"{card.name} - {card.set_code.upper()} {card.collector_number}".strip(),
        **common_data,
    )
    return product, True
