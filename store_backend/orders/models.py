from decimal import Decimal

from django.conf import settings
from django.db import models

from products.models import Product, Supplier


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
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    service_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    shipping_estimate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_estimate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_clp = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class AssistedPurchaseItem(models.Model):
    order = models.ForeignKey(AssistedPurchaseOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="assisted_order_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    subtotal_usd = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))


# Legacy order models kept for compatibility
class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        PAID = "paid", "Pagado"
        CANCELED = "canceled", "Cancelado"
        DELIVERED = "delivered", "Entregado"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
