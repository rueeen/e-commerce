from django.conf import settings
from django.db import models

from products.models import Product


class PurchaseDigitalAccess(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="digital_accesses")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="digital_accesses")
    purchased_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")
        ordering = ["-purchased_at"]

    def __str__(self) -> str:
        return f"{self.user} -> {self.product}"
