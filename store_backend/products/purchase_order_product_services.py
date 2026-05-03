from decimal import Decimal

from django.core.exceptions import ValidationError

from .models import Category, MTGCard, Product, SingleCard
from .services import extract_usd_price, get_scryfall_card_by_id


def resolve_purchase_order_product_category(category=None):
    if category is not None:
        return category

    preferred_names = ["singles", "single", "cartas individuales", "cartas individual", "carta individual"]
    categories = list(Category.objects.all())
    for cat in categories:
        if (cat.name or "").strip().lower() in preferred_names:
            return cat
    return categories[0] if categories else None


def _build_card_payload(item):
    scryfall_data = item.scryfall_data or {}
    raw_data = scryfall_data.get("raw_data") if isinstance(scryfall_data, dict) else None
    if raw_data:
        return raw_data

    scryfall_id = item.scryfall_id or (scryfall_data.get("id") if isinstance(scryfall_data, dict) else None)
    if scryfall_id:
        return get_scryfall_card_by_id(scryfall_id)

    raise ValidationError("Item sin datos Scryfall")


def create_product_from_purchase_order_item(item, *, category=None, created_by=None):
    del created_by
    if not (item.scryfall_id or item.scryfall_data):
        raise ValidationError("El item no tiene scryfall_id ni scryfall_data")
    if not item.normalized_card_name:
        raise ValidationError("El item no tiene normalized_card_name")
    if not item.style_condition:
        raise ValidationError("El item no tiene style_condition")

    card_data = _build_card_payload(item)
    scryfall_id = item.scryfall_id or card_data.get("id")
    if not scryfall_id:
        raise ValidationError("No se pudo obtener scryfall_id para el item")

    image_uris = card_data.get("image_uris") or {}
    card_faces = card_data.get("card_faces") or []
    face_images = card_faces[0].get("image_uris") if card_faces and isinstance(card_faces[0], dict) else {}

    image_large = image_uris.get("large") or image_uris.get("normal") or face_images.get("large") or ""
    image_normal = image_uris.get("normal") or face_images.get("normal") or ""
    image_small = image_uris.get("small") or face_images.get("small") or ""

    card, _ = MTGCard.objects.update_or_create(
        scryfall_id=scryfall_id,
        defaults={
            "name": card_data.get("name") or item.normalized_card_name,
            "set_name": card_data.get("set_name", ""),
            "set_code": card_data.get("set", ""),
            "collector_number": card_data.get("collector_number", ""),
            "rarity": card_data.get("rarity", ""),
            "type_line": card_data.get("type_line", ""),
            "oracle_text": card_data.get("oracle_text", ""),
            "image_large": image_large,
            "image_normal": image_normal,
            "image_small": image_small,
            "raw_data": card_data,
        },
    )

    scryfall_data = item.scryfall_data or {}
    language = (scryfall_data.get("language") or "EN").upper()
    is_foil = bool(scryfall_data.get("is_foil_detected") or scryfall_data.get("is_foil_requested"))

    existing = SingleCard.objects.select_related("product").filter(
        mtg_card=card,
        condition=item.style_condition,
        language=language,
        is_foil=is_foil,
    ).first()
    if existing:
        item.product = existing.product
        item.save(update_fields=["product"])
        return existing.product, False

    category = resolve_purchase_order_product_category(category)
    set_code = (card.set_code or "UNK").upper()
    collector_number = card.collector_number or "?"
    description = (
        f"{card.type_line}\n"
        f"Rareza: {card.rarity}\n"
        f"Set: {card.set_name}\n"
        f"Collector #: {collector_number}\n\n"
        f"{card.oracle_text}"
    )

    product = Product.objects.create(
        name=f"{card.name} - {set_code} #{collector_number} ({item.style_condition})",
        product_type=Product.ProductType.SINGLE,
        category=category,
        price_clp=int(item.sale_price_to_apply_clp or item.suggested_sale_price_clp or 0),
        price_clp_suggested=int(item.suggested_sale_price_clp or 0),
        stock=0,
        image=card.image_large or card.image_normal or card.image_small,
        is_active=False,
        description=description,
    )

    usd_reference = extract_usd_price(card_data, is_foil=is_foil)
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
