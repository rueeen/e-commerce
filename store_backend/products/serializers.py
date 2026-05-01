from rest_framework import serializers

from .models import BundleItem, Category, KardexMovement, MTGCard, PricingSettings, Product, PurchaseOrder, PurchaseOrderItem, SealedProduct, SingleCard, Supplier


class MTGCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = MTGCard
        exclude = ("raw_data",)


class SingleCardSerializer(serializers.ModelSerializer):
    mtg_card = MTGCardSerializer(read_only=True)

    class Meta:
        model = SingleCard
        fields = ("mtg_card", "condition", "language", "is_foil", "edition", "price_usd_reference")


class SealedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = SealedProduct
        fields = ("sealed_kind", "set_code")


class BundleItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = BundleItem
        fields = ("id", "item", "item_name", "quantity")


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), required=False, allow_null=True)
    single_card = SingleCardSerializer(read_only=True)
    sealed_product = SealedProductSerializer(read_only=True)
    bundle_items = BundleItemSerializer(many=True, required=False)
    computed_price_clp = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = "__all__"


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
        fields = ("id", "product", "product_name", "quantity_ordered", "quantity_received", "unit_cost_usd", "unit_cost_clp", "subtotal_clp")


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        read_only_fields = ("created_by", "received_at")


class KardexMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = KardexMovement
        fields = "__all__"


class PricingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSettings
        fields = "__all__"
