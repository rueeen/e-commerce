from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator


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


class Product(models.Model):
    class ProductType(models.TextChoices):
        SINGLE = "single", "Carta individual"
        SEALED = "sealed", "Sellado"
        BUNDLE = "bundle", "Bundle"

    class CardCondition(models.TextChoices):
        NM = "NM", "Near Mint"
        LP = "LP", "Lightly Played"
        MP = "MP", "Moderately Played"
        HP = "HP", "Heavily Played"
        DMG = "DMG", "Damaged"

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    product_type = models.CharField(max_length=20, choices=ProductType.choices, default=ProductType.SINGLE, db_index=True)
    price_clp = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)
    stock_minimum = models.PositiveIntegerField(default=0)
    average_cost_clp = models.PositiveIntegerField(default=0)
    last_purchase_cost_clp = models.PositiveIntegerField(default=0)
    image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    price_clp_suggested = models.PositiveIntegerField(default=0)
    pricing_source = models.CharField(max_length=20, choices=PricingSource.choices, default=PricingSource.MANUAL)
    pricing_last_update = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def computed_price_clp(self):
        if self.product_type == self.ProductType.BUNDLE and hasattr(self, "bundle"):
            return self.bundle.total_price_clp
        return self.price_clp


class SingleCard(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="single_card")
    mtg_card = models.ForeignKey(MTGCard, on_delete=models.PROTECT, related_name="single_products")
    condition = models.CharField(max_length=5, choices=Product.CardCondition.choices, default=Product.CardCondition.NM)
    language = models.CharField(max_length=40, default="EN")
    is_foil = models.BooleanField(default=False)
    edition = models.CharField(max_length=120, blank=True)
    price_usd_reference = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class SealedProduct(models.Model):
    class SealedKind(models.TextChoices):
        PRECON = "precon", "Precon"
        BOOSTER = "booster", "Booster"
        BUNDLE = "bundle", "Bundle"
        OTHER = "other", "Otro"

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="sealed_product")
    sealed_kind = models.CharField(max_length=20, choices=SealedKind.choices, default=SealedKind.OTHER)
    set_code = models.CharField(max_length=20, blank=True)


class BundleItem(models.Model):
    bundle = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="bundle_items", limit_choices_to={"product_type": Product.ProductType.BUNDLE})
    item = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="part_of_bundles")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ("bundle", "item")


Product.add_to_class("bundle", property(lambda self: _BundleProxy(self)))


class _BundleProxy:
    def __init__(self, product):
        self.product = product

    @property
    def total_price_clp(self):
        return sum(i.quantity * i.item.computed_price_clp for i in self.product.bundle_items.select_related("item"))

# keep rest unchanged

class KardexMovement(models.Model):
    class MovementType(models.TextChoices):
        PURCHASE_IN = "PURCHASE_IN", "Compra ingreso"
        SALE_OUT = "SALE_OUT", "Venta salida"
        RETURN_IN = "RETURN_IN", "Devolución ingreso"
        MANUAL_IN = "MANUAL_IN", "Entrada manual"
        MANUAL_OUT = "MANUAL_OUT", "Salida manual"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"
        CORRECTION = "CORRECTION", "Corrección"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="kardex_movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.PositiveIntegerField()
    previous_stock = models.PositiveIntegerField()
    new_stock = models.PositiveIntegerField()
    unit_cost_clp = models.PositiveIntegerField(default=0)
    unit_price_clp = models.PositiveIntegerField(default=0)
    reference_type = models.CharField(max_length=80, blank=True)
    reference_id = models.CharField(max_length=80, blank=True)
    reference_label = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="kardex_movements")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class Supplier(models.Model):
    name = models.CharField(max_length=120, unique=True)
    rut = models.CharField(max_length=20, blank=True)
    contact_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        SENT = "SENT", "Enviada"
        RECEIVED = "RECEIVED", "Recibida"
        CANCELLED = "CANCELLED", "Cancelada"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchase_orders")
    order_number = models.CharField(max_length=50, unique=True)
    external_reference = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    subtotal_clp = models.PositiveIntegerField(default=0)
    shipping_clp = models.PositiveIntegerField(default=0)
    import_fees_clp = models.PositiveIntegerField(default=0)
    taxes_clp = models.PositiveIntegerField(default=0)
    total_clp = models.PositiveIntegerField(default=0)
    subtotal_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_fee_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_paid_clp = models.PositiveIntegerField(default=0)
    customs_clp = models.PositiveIntegerField(default=0)
    handling_clp = models.PositiveIntegerField(default=0)
    other_costs_clp = models.PositiveIntegerField(default=0)
    total_real_clp = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    received_at = models.DateTimeField(null=True, blank=True)
    update_prices_on_receive = models.BooleanField(default=False)


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="purchase_order_items")
    quantity_ordered = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    quantity_received = models.PositiveIntegerField(default=0)
    unit_cost_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost_clp = models.PositiveIntegerField(default=0)
    subtotal_clp = models.PositiveIntegerField(default=0)


class InventoryLot(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="lots")
    purchase_order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.PROTECT,
        related_name="lots",
        null=True,
        blank=True,
    )
    quantity_initial = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    quantity_remaining = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    unit_cost_clp = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    received_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["received_at", "id"]


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
    usd_to_clp_real = models.DecimalField(max_digits=12, decimal_places=2, default=1000)
    usd_to_clp_store = models.DecimalField(max_digits=12, decimal_places=2, default=1150)
    default_margin = models.DecimalField(max_digits=6, decimal_places=2, default=1.30)
    min_margin = models.DecimalField(max_digits=6, decimal_places=2, default=1.15)
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
