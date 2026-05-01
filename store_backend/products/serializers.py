from django.db import IntegrityError, transaction
from django.utils import timezone
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
    order_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"
        read_only_fields = ("created_by", "received_at")

    def validate_order_number(self, value):
        if value is None:
            return ""
        return value.strip()

    def validate(self, attrs):
        items = attrs.get("items", [])
        supplier = attrs.get("supplier")
        if not supplier:
            raise serializers.ValidationError({"supplier": ["Este campo es requerido."]})
        if not items:
            raise serializers.ValidationError({"items": ["Debes agregar al menos 1 item."]})
        return attrs

    def _generate_order_number(self):
        date_prefix = timezone.localdate().strftime("%Y%m%d")
        base = f"PO-{date_prefix}-"
        last_po = PurchaseOrder.objects.filter(order_number__startswith=base).order_by("-order_number").first()
        next_seq = 1
        if last_po:
            try:
                next_seq = int(last_po.order_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                next_seq = 1
        return f"{base}{next_seq:04d}"

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        order_number = (validated_data.get("order_number") or "").strip()
        attempts = 0
        while True:
            attempts += 1
            if not order_number:
                validated_data["order_number"] = self._generate_order_number()
            else:
                validated_data["order_number"] = order_number

            subtotal = 0
            normalized_items = []
            for item_data in items_data:
                if not item_data.get("product"):
                    raise serializers.ValidationError({"items": ["Cada item debe tener un producto."]})
                qty = int(item_data.get("quantity_ordered") or 0)
                unit_cost = int(item_data.get("unit_cost_clp") or 0)
                if qty <= 0:
                    raise serializers.ValidationError({"items": ["quantity_ordered debe ser mayor a 0."]})
                if unit_cost < 0:
                    raise serializers.ValidationError({"items": ["unit_cost_clp debe ser mayor o igual a 0."]})
                item_subtotal = qty * unit_cost
                subtotal += item_subtotal
                normalized_items.append({**item_data, "subtotal_clp": item_subtotal})

            validated_data["subtotal_clp"] = subtotal
            validated_data["total_clp"] = subtotal + int(validated_data.get("shipping_clp") or 0) + int(validated_data.get("import_fees_clp") or 0) + int(validated_data.get("taxes_clp") or 0)

            try:
                order = PurchaseOrder.objects.create(**validated_data)
                break
            except IntegrityError:
                if order_number or attempts >= 5:
                    raise serializers.ValidationError({"order_number": ["Este número de orden ya existe."]})

        for item_data in normalized_items:
            PurchaseOrderItem.objects.create(
                purchase_order=order,
                **item_data,
            )
        return order


class KardexMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = KardexMovement
        fields = "__all__"


class PricingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSettings
        fields = "__all__"
