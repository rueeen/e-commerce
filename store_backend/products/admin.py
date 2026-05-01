from django.contrib import admin

from .models import BundleItem, ExchangeRateConfig, KardexMovement, MTGCard, PricingSettings, Product, SealedProduct, ServiceFeeConfig, ShippingConfig, SingleCard, Supplier


class SingleCardInline(admin.StackedInline):
    model = SingleCard
    extra = 0


class SealedProductInline(admin.StackedInline):
    model = SealedProduct
    extra = 0


class BundleItemInline(admin.TabularInline):
    model = BundleItem
    fk_name = "bundle"
    extra = 1
    autocomplete_fields = ("item",)


@admin.register(MTGCard)
class MTGCardAdmin(admin.ModelAdmin):
    list_display = ("name", "set_code", "collector_number", "rarity", "released_at")
    search_fields = ("name", "scryfall_id", "set_code", "collector_number")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "product_type", "price_clp", "stock", "is_active")
    list_filter = ("product_type", "is_active")
    search_fields = ("name", "single_card__mtg_card__name")
    inlines = (SingleCardInline, SealedProductInline, BundleItemInline)


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
