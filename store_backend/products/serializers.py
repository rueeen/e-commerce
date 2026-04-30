from rest_framework import serializers

from .models import Category, KardexMovement, MTGCard, PricingSettings, Product, PurchaseOrder, PurchaseOrderItem, Supplier


class MTGCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = MTGCard
        exclude = ("raw_data",)


class ProductSerializer(serializers.ModelSerializer):
    mtg_card = MTGCardSerializer(read_only=True)
    category = serializers.StringRelatedField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), required=False, allow_null=True)
    mtg_card_id = serializers.PrimaryKeyRelatedField(source="mtg_card", queryset=MTGCard.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "description", "product_type", "price", "price_clp", "stock", "stock_minimum", "average_cost_clp", "last_purchase_cost_clp", "image", "is_active", "condition",
            "language", "is_foil", "edition", "notes", "price_usd_reference", "price_clp_suggested", "price_clp_final", "pricing_source", "pricing_last_update", "created_at", "mtg_card", "mtg_card_id", "category", "category_id",
        )
        read_only_fields = ("created_at", "stock", "average_cost_clp", "last_purchase_cost_clp")


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "is_active", "products_count", "created_at", "updated_at")


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ("id", "product", "product_name", "quantity_ordered", "quantity_received", "unit_cost_clp", "subtotal_clp")


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        read_only_fields = ("created_by", "received_at")

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        po = PurchaseOrder.objects.create(**validated_data)
        subtotal = 0
        for item in items:
            item["subtotal_clp"] = int(item["quantity_ordered"]) * int(item.get("unit_cost_clp", 0))
            subtotal += item["subtotal_clp"]
            PurchaseOrderItem.objects.create(purchase_order=po, **item)
        po.subtotal_clp = subtotal
        po.total_clp = subtotal + po.shipping_clp + po.import_fees_clp + po.taxes_clp
        po.save(update_fields=["subtotal_clp", "total_clp"])
        return po


class KardexMovementSerializer(serializers.ModelSerializer):
    producto = serializers.CharField(source="product.name", read_only=True)
    usuario = serializers.CharField(source="created_by.username", read_only=True)
    reference_display = serializers.SerializerMethodField()

    class Meta:
        model = KardexMovement
        fields = "__all__"

    def get_reference_display(self, obj):
        if obj.reference_label:
            return obj.reference_label
        if obj.reference_type and obj.reference_id:
            return f"{obj.reference_type} #{obj.reference_id}"
        if obj.reference_type:
            return obj.reference_type
        return "Sin referencia"


class PricingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSettings
        fields = "__all__"
