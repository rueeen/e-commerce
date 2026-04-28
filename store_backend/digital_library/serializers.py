from rest_framework import serializers

from .models import PurchaseDigitalAccess


class PurchaseDigitalAccessSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_description = serializers.CharField(source="product.description", read_only=True)
    product_image = serializers.CharField(source="product.image", read_only=True)

    class Meta:
        model = PurchaseDigitalAccess
        fields = (
            "id",
            "product",
            "product_name",
            "product_description",
            "product_image",
            "purchased_at",
        )
