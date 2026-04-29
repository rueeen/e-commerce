from rest_framework import serializers

from .models import AssistedPurchaseItem, AssistedPurchaseOrder


class AssistedPurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = AssistedPurchaseItem
        fields = ("id", "product", "product_name", "quantity", "unit_price_usd", "subtotal_usd")


class AssistedPurchaseOrderSerializer(serializers.ModelSerializer):
    items = AssistedPurchaseItemSerializer(many=True)

    class Meta:
        model = AssistedPurchaseOrder
        fields = (
            "id", "user", "supplier", "status", "subtotal_usd", "exchange_rate", "service_fee", "shipping_estimate",
            "tax_estimate", "total_clp", "notes", "created_at", "updated_at", "items",
        )
        read_only_fields = ("user", "created_at", "updated_at")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = AssistedPurchaseOrder.objects.create(**validated_data)
        for item_data in items_data:
            AssistedPurchaseItem.objects.create(order=order, **item_data)
        return order
