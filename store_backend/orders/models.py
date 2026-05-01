from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from products.models import PricingSettings, Product, Supplier


class AssistedPurchaseOrder(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Solicitado"
        QUOTED = "quoted", "Cotizado"
        APPROVED = "approved", "Aprobado"
        PAID = "paid", "Pagado"
        PURCHASED = "purchased", "Comprado"
        RECEIVED = "received", "Recibido"
        SHIPPED = "shipped", "Enviado"
        DELIVERED = "delivered", "Entregado"
        CANCELLED = "cancelled", "Cancelado"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assisted_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="assisted_orders", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    subtotal_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    payment_fee_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    exchange_rate_real = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1000.00"))
    exchange_rate_store = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1150.00"))
    customs_clp = models.PositiveIntegerField(default=0)
    handling_clp = models.PositiveIntegerField(default=0)
    other_costs_clp = models.PositiveIntegerField(default=0)
    service_fee_clp = models.PositiveIntegerField(default=0)
    total_customer_clp = models.PositiveIntegerField(default=0)
    total_real_cost_clp = models.PositiveIntegerField(default=0)
    profit_clp = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def _active_pricing(self):
        return PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first()

    def recalculate_items(self):
        self.subtotal_usd = sum((item.subtotal_usd for item in self.items.all()), Decimal("0.00"))

    def calculate_real_cost(self):
        usd_cost = self.subtotal_usd + self.shipping_usd + self.payment_fee_usd
        self.total_real_cost_clp = int((usd_cost * self.exchange_rate_real)) + self.customs_clp + self.handling_clp + self.other_costs_clp
        return self.total_real_cost_clp

    def calculate_customer_total(self):
        usd_customer = self.subtotal_usd + self.shipping_usd + self.payment_fee_usd
        self.total_customer_clp = int(usd_customer * self.exchange_rate_store) + self.customs_clp + self.handling_clp + self.other_costs_clp + self.service_fee_clp
        return self.total_customer_clp

    def calculate_profit(self):
        self.profit_clp = self.total_customer_clp - self.total_real_cost_clp
        return self.profit_clp

    def calculate_totals(self):
        settings_obj = self._active_pricing()
        if settings_obj:
            self.exchange_rate_real = settings_obj.usd_to_clp_real
            self.exchange_rate_store = settings_obj.usd_to_clp_store
        self.recalculate_items()
        self.calculate_real_cost()
        self.calculate_customer_total()
        self.calculate_profit()


class AssistedPurchaseItem(models.Model):
    order = models.ForeignKey(AssistedPurchaseOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="assisted_order_items", null=True, blank=True)
    external_name = models.CharField(max_length=255, blank=True)
    external_url = models.URLField(blank=True)
    external_sku = models.CharField(max_length=120, blank=True)
    requested_condition = models.CharField(max_length=20, blank=True)
    requested_language = models.CharField(max_length=20, blank=True)
    is_foil = models.BooleanField(default=False)
    quantity = models.PositiveIntegerField(default=1)
    unit_price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    subtotal_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    def clean(self):
        if not self.product and not self.external_name:
            raise ValidationError("Debe indicar product o external_name.")
        if self.quantity <= 0:
            raise ValidationError("La cantidad debe ser mayor a 0.")

    def save(self, *args, **kwargs):
        self.full_clean()
        self.subtotal_usd = self.unit_price_usd * self.quantity
        super().save(*args, **kwargs)


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        PAID = "paid", "Pagado"
        PROCESSING = "processing", "Procesando"
        SHIPPED = "shipped", "Enviado"
        DELIVERED = "delivered", "Entregado"
        CANCELED = "canceled", "Cancelado"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    subtotal_clp = models.PositiveIntegerField(default=0)
    shipping_clp = models.PositiveIntegerField(default=0)
    discount_clp = models.PositiveIntegerField(default=0)
    total_clp = models.PositiveIntegerField(default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField()
    product_name_snapshot = models.CharField(max_length=255, default="")
    product_type_snapshot = models.CharField(max_length=20, default="")
    unit_price_clp = models.PositiveIntegerField(default=0)
    subtotal_clp = models.PositiveIntegerField(default=0)
    unit_cost_clp = models.IntegerField(default=0)
    total_cost_clp = models.IntegerField(default=0)
    gross_profit_clp = models.IntegerField(default=0)
