from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]


class MTGCard(models.Model):
    scryfall_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    set_name = models.CharField(max_length=255, blank=True)
    set_code = models.CharField(max_length=20, blank=True)
    collector_number = models.CharField(max_length=20, blank=True)
    rarity = models.CharField(max_length=30, blank=True)
    mana_cost = models.CharField(max_length=80, blank=True)
    type_line = models.CharField(max_length=255, blank=True)
    oracle_text = models.TextField(blank=True)
    colors = models.JSONField(default=list, blank=True)
    color_identity = models.JSONField(default=list, blank=True)
    legalities = models.JSONField(default=dict, blank=True)
    image_normal = models.URLField(blank=True)
    image_small = models.URLField(blank=True)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    released_at = models.DateField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


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
    created_at = models.DateTimeField(auto_now_add=True)


class Supplier(models.Model):
    name = models.CharField(max_length=120, unique=True)
    website_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)


class ExchangeRateConfig(models.Model):
    name = models.CharField(max_length=80, default="default")
    usd_to_clp = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
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
