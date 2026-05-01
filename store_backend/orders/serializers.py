from rest_framework import serializers

from .models import AssistedPurchaseItem, AssistedPurchaseOrder, Order, OrderItem


class AssistedPurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = AssistedPurchaseItem
        fields = (
            "id", "product", "product_name", "external_name", "external_url", "external_sku",
            "requested_condition", "requested_language", "is_foil", "quantity", "unit_price_usd", "subtotal_usd",
        )


class AssistedPurchaseOrderSerializer(serializers.ModelSerializer):
    items = AssistedPurchaseItemSerializer(many=True)

    class Meta:
        model = AssistedPurchaseOrder
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at", "profit_clp", "total_real_cost_clp", "total_customer_clp")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order = AssistedPurchaseOrder.objects.create(**validated_data)
        for item_data in items_data:
            AssistedPurchaseItem.objects.create(order=order, **item_data)
        order.calculate_totals()
        order.save()
        return order


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = "__all__"
