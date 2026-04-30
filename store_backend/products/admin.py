from django.contrib import admin

from .models import ExchangeRateConfig, KardexMovement, MTGCard, PricingSettings, Product, ServiceFeeConfig, ShippingConfig, Supplier


@admin.register(MTGCard)
class MTGCardAdmin(admin.ModelAdmin):
    list_display = ("name", "set_code", "collector_number", "rarity", "released_at")
    search_fields = ("name", "scryfall_id", "set_code", "collector_number")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "product_type", "price_clp_final", "price_clp_suggested", "price_usd_reference", "stock", "condition", "language", "is_foil", "mtg_card", "is_active")
    search_fields = ("name", "mtg_card__name", "mtg_card__set_code", "mtg_card__collector_number")
    list_filter = ("product_type", "condition", "language", "is_foil", "is_active")


admin.site.register(Supplier)
admin.site.register(ExchangeRateConfig)
admin.site.register(ServiceFeeConfig)
admin.site.register(ShippingConfig)


@admin.register(PricingSettings)
class PricingSettingsAdmin(admin.ModelAdmin):
    list_display = ("name", "usd_to_clp", "import_factor", "risk_factor", "margin_factor", "rounding_to", "is_active", "updated_at")


@admin.register(KardexMovement)
class KardexMovementAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "movement_type", "quantity", "previous_stock", "new_stock", "created_by", "created_at")
    list_filter = ("product", "movement_type", "created_at", "created_by")
    search_fields = ("product__name", "reference", "notes")
