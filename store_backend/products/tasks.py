from decimal import Decimal

from celery import shared_task
from django.utils import timezone

from .models import PricingSource, Product, SingleCard
from .services import extract_usd_price, get_scryfall_card_by_id


@shared_task
def sync_product_external_price(product_id, exchange_rate_usd_clp):
    product = Product.objects.filter(id=product_id).select_related("single_card").first()
    if not product or not hasattr(product, "single_card"):
        return {"updated": False, "reason": "product_not_single"}

    single_card: SingleCard = product.single_card
    card_data = get_scryfall_card_by_id(single_card.mtg_card.scryfall_id)
    usd_price = extract_usd_price(card_data, is_foil=single_card.is_foil)

    product.price_external_usd = Decimal(str(usd_price or 0))
    product.exchange_rate_usd_clp = Decimal(str(exchange_rate_usd_clp or 0))
    product.pricing_source = PricingSource.SCRYFALL
    product.pricing_last_update = timezone.now()
    product.save(
        update_fields=[
            "price_external_usd",
            "exchange_rate_usd_clp",
            "pricing_source",
            "pricing_last_update",
            "updated_at",
        ]
    )
    return {"updated": True, "product_id": product.id}
