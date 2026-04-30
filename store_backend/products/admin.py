from django.contrib import admin

from .models import ExchangeRateConfig, MTGCard, Product, ServiceFeeConfig, ShippingConfig, Supplier


@admin.register(MTGCard)
class MTGCardAdmin(admin.ModelAdmin):
    list_display = ("name", "set_code", "collector_number", "rarity", "released_at")
    search_fields = ("name", "scryfall_id", "set_code", "collector_number")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "product_type", "price_clp", "stock", "condition", "language", "is_foil", "mtg_card", "is_active")
    search_fields = ("name", "mtg_card__name", "mtg_card__set_code", "mtg_card__collector_number")
    list_filter = ("product_type", "condition", "language", "is_foil", "is_active")


admin.site.register(Supplier)
admin.site.register(ExchangeRateConfig)
admin.site.register(ServiceFeeConfig)
admin.site.register(ShippingConfig)
