from django.conf import settings
from django.db import models
from django.utils import timezone


class PricingSource(models.TextChoices):
    SCRYFALL = "SCRYFALL", "Scryfall"
    MANUAL = "MANUAL", "Manual"


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MTGCard(models.Model):
    scryfall_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    printed_name = models.CharField(max_length=255, blank=True)
    set_name = models.CharField(max_length=255, blank=True)
    set_code = models.CharField(max_length=20, blank=True)
    collector_number = models.CharField(max_length=20, blank=True)
    rarity = models.CharField(max_length=30, blank=True)
    mana_cost = models.CharField(max_length=80, blank=True)
    type_line = models.CharField(max_length=255, blank=True)
    oracle_text = models.TextField(blank=True)
    colors = models.JSONField(default=list, blank=True)
    color_identity = models.JSONField(default=list, blank=True)
    image_small = models.URLField(blank=True)
    image_normal = models.URLField(blank=True)
    image_large = models.URLField(blank=True)
    scryfall_uri = models.URLField(blank=True)
    released_at = models.DateField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "set_code", "collector_number"]

    def __str__(self):
        return f"{self.name} [{self.set_code.upper()} #{self.collector_number}]" if self.set_code else self.name


class Product(models.Model):
    class ProductType(models.TextChoices):
        SINGLE = "single", "Carta individual"
        SEALED = "sealed", "Producto sellado"
        ACCESSORY = "accessory", "Accesorio"
        DECK = "deck", "Mazo"
        BUNDLE = "bundle", "Bundle"

    class CardCondition(models.TextChoices):
        NM = "NM", "Near Mint"
        LP = "LP", "Lightly Played"
        MP = "MP", "Moderately Played"
        HP = "HP", "Heavily Played"
        DMG = "DMG", "Damaged"

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", null=True, blank=True)
    mtg_card = models.ForeignKey(MTGCard, on_delete=models.SET_NULL, related_name="products", null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    product_type = models.CharField(max_length=20, choices=ProductType.choices, default=ProductType.SINGLE)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_clp = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)
    image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    condition = models.CharField(max_length=5, choices=CardCondition.choices, default=CardCondition.NM)
    language = models.CharField(max_length=40, default="EN")
    is_foil = models.BooleanField(default=False)
    edition = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    price_usd_reference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    price_clp_suggested = models.PositiveIntegerField(default=0)
    price_clp_final = models.PositiveIntegerField(default=0)
    pricing_source = models.CharField(max_length=20, choices=PricingSource.choices, default=PricingSource.MANUAL)
    pricing_last_update = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class KardexMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = "IN", "Entrada manual"
        OUT = "OUT", "Salida manual"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"
        SALE = "SALE", "Venta"
        RETURN = "RETURN", "Devolución"
        CORRECTION = "CORRECTION", "Corrección"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="kardex_movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.PositiveIntegerField()
    previous_stock = models.PositiveIntegerField()
    new_stock = models.PositiveIntegerField()
    unit_cost_clp = models.PositiveIntegerField(default=0)
    unit_price_clp = models.PositiveIntegerField(default=0)
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="kardex_movements")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class Supplier(models.Model):
    name = models.CharField(max_length=120, unique=True)
    website_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)


class ExchangeRateConfig(models.Model):
    name = models.CharField(max_length=80, default="default")
    usd_to_clp = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ServiceFeeConfig(models.Model):
    name = models.CharField(max_length=80, default="default")
    percentage = models.DecimalField(max_digits=5, decimal_places=2)
    flat_fee_clp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)


class ShippingConfig(models.Model):
    name = models.CharField(max_length=80, default="default")
    base_clp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    per_item_clp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)


class PricingSettings(models.Model):
    name = models.CharField(max_length=120, default="Configuración principal")
    usd_to_clp = models.DecimalField(max_digits=12, decimal_places=2, default=1000)
    import_factor = models.DecimalField(max_digits=5, decimal_places=2, default=1.30)
    risk_factor = models.DecimalField(max_digits=5, decimal_places=2, default=1.10)
    margin_factor = models.DecimalField(max_digits=5, decimal_places=2, default=1.25)
    rounding_to = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuración de precios"
        verbose_name_plural = "Configuraciones de precios"

    def __str__(self):
        return self.name
