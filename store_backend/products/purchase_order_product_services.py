from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.dateparse import parse_date

from .models import Category, MTGCard, Product, SingleCard
from .services import (
    extract_usd_price,
    get_scryfall_card_by_id,
    resolve_scryfall_card,
)

PREFERRED_SINGLE_CATEGORY_NAMES = {
    "singles",
    "single",
    "cartas individuales",
    "cartas individual",
    "carta individual",
}

PREFERRED_SINGLE_CATEGORY_SLUGS = {
    "singles",
    "single",
    "cartas-individuales",
    "carta-individual",
}


CONDITION_MAP = {
    "NM": Product.CardCondition.NM,
    "EX": Product.CardCondition.LP,
    "LP": Product.CardCondition.LP,
    "VG": Product.CardCondition.MP,
    "MP": Product.CardCondition.MP,
    "HP": Product.CardCondition.HP,
    "DMG": Product.CardCondition.DMG,
}


def normalize_condition(value):
    condition = str(value or "").strip().upper()

    if condition in CONDITION_MAP:
        return CONDITION_MAP[condition]

    raise ValidationError(f"Condición inválida para carta single: {value}")


def resolve_purchase_order_product_category(category=None):
    if category is not None:
        return category

    category = (
        Category.objects.filter(slug__in=PREFERRED_SINGLE_CATEGORY_SLUGS)
        .order_by("name")
        .first()
    )

    if category:
        return category

    categories = list(Category.objects.all().order_by("name"))

    for cat in categories:
        name = str(cat.name or "").strip().lower()

        if name in PREFERRED_SINGLE_CATEGORY_NAMES:
            return cat

    return categories[0] if categories else None


def resolve_purchase_order_item_scryfall(item):
    """
    Garantiza que el PurchaseOrderItem tenga datos suficientes de Scryfall.

    Si el importador solo dejó normalized_card_name/set_name_detected,
    este método busca la carta en Scryfall y guarda scryfall_id/scryfall_data
    en el item para que luego se pueda crear MTGCard/Product/SingleCard.
    """
    if item.scryfall_id or item.scryfall_data:
        return item

    card_name = (
        item.normalized_card_name
        or item.raw_description
        or ""
    ).strip()

    if not card_name:
        raise ValidationError(
            "El item no tiene nombre de carta para buscar en Scryfall."
        )

    set_hint = str(getattr(item, "set_name_detected", "") or "").strip()

    is_foil = bool(
        getattr(item, "is_foil_detected", False)
        or getattr(item, "is_foil", False)
    )

    try:
        _card, card_data, warnings = resolve_scryfall_card(name=card_name)
    except ValidationError as exc:
        raise ValidationError(
            f"No se pudo resolver Scryfall para item #{item.id}: "
            f"{card_name} / set_hint={set_hint or '-'} ({exc})"
        ) from exc

    scryfall_id = card_data.get("id")
    if not scryfall_id:
        raise ValidationError(
            f"No se pudo resolver Scryfall para item #{item.id}: "
            f"{card_name} / set_hint={set_hint or '-'} (sin scryfall_id)"
        )

    item.scryfall_id = scryfall_id
    item.scryfall_data = {
        "raw_data": card_data,
        "warnings": warnings or [],
        "set_hint": set_hint,
        "is_foil_requested": is_foil,
        "language": str(getattr(item, "language", "") or "EN").upper(),
    }

    update_fields = ["scryfall_id", "scryfall_data"]
    if hasattr(item, "scryfall_status"):
        item.scryfall_status = "matched"
        update_fields.append("scryfall_status")
    item.save(update_fields=update_fields)
    return item


def ensure_item_has_scryfall_data(item):
    return resolve_purchase_order_item_scryfall(item)


def _build_card_payload(item):
    scryfall_data = item.scryfall_data or {}

    if not isinstance(scryfall_data, dict):
        scryfall_data = {}

    raw_data = scryfall_data.get("raw_data") or scryfall_data.get("card")

    if raw_data and isinstance(raw_data, dict):
        return raw_data

    if isinstance(scryfall_data, dict) and scryfall_data.get("id"):
        return scryfall_data

    scryfall_id = item.scryfall_id or scryfall_data.get("id")

    if scryfall_id:
        return get_scryfall_card_by_id(scryfall_id)

    raise ValidationError("El item no tiene datos suficientes de Scryfall.")


def _get_card_images(card_data):
    image_uris = card_data.get("image_uris") or {}
    card_faces = card_data.get("card_faces") or []

    face_images = {}

    if card_faces and isinstance(card_faces[0], dict):
        face_images = card_faces[0].get("image_uris") or {}

    image_large = (
        image_uris.get("large")
        or face_images.get("large")
        or image_uris.get("normal")
        or face_images.get("normal")
        or ""
    )

    image_normal = (
        image_uris.get("normal")
        or face_images.get("normal")
        or image_large
        or ""
    )

    image_small = (
        image_uris.get("small")
        or face_images.get("small")
        or image_normal
        or ""
    )

    return {
        "image_large": image_large,
        "image_normal": image_normal,
        "image_small": image_small,
    }


def _get_or_update_mtg_card(item, card_data):
    scryfall_id = item.scryfall_id or card_data.get("id")

    if not scryfall_id:
        raise ValidationError("No se pudo obtener scryfall_id para el item.")

    images = _get_card_images(card_data)

    released_at = None

    if card_data.get("released_at"):
        released_at = parse_date(str(card_data.get("released_at")))

    card, _ = MTGCard.objects.update_or_create(
        scryfall_id=scryfall_id,
        defaults={
            "name": card_data.get("name") or item.normalized_card_name,
            "printed_name": card_data.get("printed_name") or "",
            "set_name": card_data.get("set_name") or "",
            "set_code": card_data.get("set") or "",
            "collector_number": card_data.get("collector_number") or "",
            "rarity": card_data.get("rarity") or "",
            "mana_cost": card_data.get("mana_cost") or "",
            "type_line": card_data.get("type_line") or "",
            "oracle_text": card_data.get("oracle_text") or "",
            "colors": card_data.get("colors") or [],
            "color_identity": card_data.get("color_identity") or [],
            "image_large": images["image_large"],
            "image_normal": images["image_normal"],
            "image_small": images["image_small"],
            "scryfall_uri": card_data.get("scryfall_uri") or "",
            "released_at": released_at,
            "raw_data": card_data,
        },
    )

    return card


def _get_language_and_foil(item):
    scryfall_data = item.scryfall_data or {}

    if not isinstance(scryfall_data, dict):
        scryfall_data = {}

    language = str(
        scryfall_data.get("language")
        or getattr(item, "language", "")
        or "EN"
    ).strip().upper() or "EN"

    is_foil = bool(
        scryfall_data.get("is_foil_detected")
        or scryfall_data.get("is_foil_requested")
        or getattr(item, "is_foil_detected", False)
    )

    return language, is_foil


def _build_product_name(card, item, is_foil=False):
    set_code = str(card.set_code or "UNK").upper()
    collector_number = card.collector_number or "?"

    foil_text = " Foil" if is_foil else ""

    return (
        f"{card.name} - {set_code} #{collector_number} "
        f"({item.style_condition}{foil_text})"
    )


def _build_product_description(card):
    parts = []

    if card.type_line:
        parts.append(card.type_line)

    if card.rarity:
        parts.append(f"Rareza: {card.rarity}")

    if card.set_name:
        parts.append(f"Set: {card.set_name}")

    if card.collector_number:
        parts.append(f"Collector #: {card.collector_number}")

    if card.oracle_text:
        parts.append("")
        parts.append(card.oracle_text)

    return "\n".join(parts).strip()


def _get_sale_price(item):
    return int(
        item.sale_price_to_apply_clp
        or item.suggested_sale_price_clp
        or 0
    )


def _get_suggested_price(item):
    return int(item.suggested_sale_price_clp or 0)


@transaction.atomic
def create_product_from_purchase_order_item(item, *, category=None, created_by=None):
    """
    Crea o reutiliza un producto single desde un PurchaseOrderItem.

    Reglas:
    - Si falta Scryfall, intenta resolverlo automáticamente.
    - Usa datos de Scryfall para poblar MTGCard.
    - Evita duplicar SingleCard para la misma carta, condición, idioma y foil.
    - Crea Product inactivo para que el administrador revise antes de publicar.
    - No modifica stock. El stock debe entrar por recepción de orden/lotes/Kardex.
    """
    del created_by

    item = ensure_item_has_scryfall_data(item)

    if not item.scryfall_id and not item.scryfall_data:
        raise ValidationError("El item no tiene scryfall_id ni scryfall_data.")

    if not item.normalized_card_name:
        raise ValidationError("El item no tiene normalized_card_name.")

    if not item.style_condition:
        raise ValidationError("El item no tiene style_condition.")

    item.style_condition = normalize_condition(item.style_condition)

    card_data = _build_card_payload(item)
    card = _get_or_update_mtg_card(item, card_data)

    language, is_foil = _get_language_and_foil(item)

    existing = (
        SingleCard.objects.select_related("product")
        .filter(
            mtg_card=card,
            condition=item.style_condition,
            language=language,
            is_foil=is_foil,
        )
        .first()
    )

    if existing:
        item.product = existing.product
        item.save(update_fields=["product"])
        return existing.product, False

    category = resolve_purchase_order_product_category(category)

    product = Product.objects.create(
        name=_build_product_name(card, item, is_foil=is_foil),
        product_type=Product.ProductType.SINGLE,
        category=category,
        price_clp=_get_sale_price(item),
        price_clp_suggested=_get_suggested_price(item),
        stock=0,
        image=card.image_large or card.image_normal or card.image_small,
        is_active=False,
        description=_build_product_description(card),
    )

    usd_reference = extract_usd_price(
        card_data,
        is_foil=is_foil,
    )

    SingleCard.objects.create(
        product=product,
        mtg_card=card,
        condition=item.style_condition,
        language=language,
        is_foil=is_foil,
        edition=card.set_name,
        price_usd_reference=Decimal(str(usd_reference or 0)),
    )

    item.product = product
    item.save(update_fields=["product"])

    return product, True
