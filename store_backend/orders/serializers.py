from rest_framework import serializers

from .models import (
    AssistedPurchaseItem,
    AssistedPurchaseOrder,
    Order,
    OrderItem,
)


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product_name_snapshot",
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "product_name_snapshot",
            "product_type_snapshot",
            "quantity",
            "unit_price_clp",
            "subtotal_clp",
            "unit_cost_clp",
            "total_cost_clp",
            "gross_profit_clp",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "user",
            "status",
            "status_display",
            "subtotal_clp",
            "shipping_clp",
            "discount_clp",
            "total_clp",
            "stock_consumed",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "items",
        )
        read_only_fields = (
            "id",
            "user",
            "status",
            "status_display",
            "subtotal_clp",
            "total_clp",
            "stock_consumed",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "items",
        )


class AssistedPurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    class Meta:
        model = AssistedPurchaseItem
        fields = (
            "id",
            "product",
            "product_name",
            "external_name",
            "external_url",
            "external_sku",
            "requested_condition",
            "requested_language",
            "is_foil",
            "quantity",
            "unit_price_usd",
            "subtotal_usd",
        )
        read_only_fields = (
            "id",
            "product_name",
            "subtotal_usd",
        )

    def validate(self, attrs):
        product = attrs.get("product")
        external_name = attrs.get("external_name")

        if not product and not external_name:
            raise serializers.ValidationError(
                "Debe indicar un producto interno o un nombre externo."
            )

        quantity = attrs.get("quantity", 1)
        if quantity <= 0:
            raise serializers.ValidationError({
                "quantity": "La cantidad debe ser mayor a 0."
            })

        unit_price_usd = attrs.get("unit_price_usd", 0)
        if unit_price_usd < 0:
            raise serializers.ValidationError({
                "unit_price_usd": "El precio unitario no puede ser negativo."
            })

        return attrs


class AssistedPurchaseOrderSerializer(serializers.ModelSerializer):
    items = AssistedPurchaseItemSerializer(many=True)

    class Meta:
        model = AssistedPurchaseOrder
        fields = (
            "id",
            "user",
            "supplier",
            "status",
            "subtotal_usd",
            "shipping_usd",
            "payment_fee_usd",
            "exchange_rate_real",
            "exchange_rate_store",
            "customs_clp",
            "handling_clp",
            "other_costs_clp",
            "service_fee_clp",
            "total_customer_clp",
            "total_real_cost_clp",
            "profit_clp",
            "notes",
            "created_at",
            "updated_at",
            "items",
        )
        read_only_fields = (
            "id",
            "user",
            "subtotal_usd",
            "total_customer_clp",
            "total_real_cost_clp",
            "profit_clp",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        items_data = self.initial_data.get("items", [])

        if not items_data:
            raise serializers.ValidationError({
                "items": "Debe agregar al menos un producto."
            })

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])

        order = AssistedPurchaseOrder.objects.create(**validated_data)

        for item_data in items_data:
            AssistedPurchaseItem.objects.create(
                order=order,
                **item_data,
            )

        order.calculate_totals()
        order.save()

        return order
