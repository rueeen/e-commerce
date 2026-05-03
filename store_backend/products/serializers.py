from django.db import IntegrityError, transaction
from django.utils import timezone
from decimal import Decimal
from rest_framework import serializers

from .models import BundleItem, Category, KardexMovement, MTGCard, PricingSettings, Product, PurchaseOrder, PurchaseOrderItem, SealedProduct, SingleCard, Supplier
from .purchase_order_services import get_active_exchange_rate, recalculate_purchase_order


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
    cost_real_clp = serializers.IntegerField(read_only=True)
    margin_clp = serializers.IntegerField(read_only=True)
    margin_percentage = serializers.FloatField(read_only=True)
    suggested_price_clp = serializers.IntegerField(read_only=True)

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
        fields = (
            "id", "product", "product_name", "raw_description", "normalized_card_name", "set_name_detected", "style_condition",
            "quantity_ordered", "quantity_received", "unit_price_original", "line_total_original", "unit_price_clp", "line_total_clp",
            "allocated_extra_cost_clp", "allocated_tax_clp", "real_unit_cost_clp", "margin_percent", "suggested_sale_price_clp",
            "sale_price_to_apply_clp", "scryfall_id", "scryfall_data",
        )
        read_only_fields = ("quantity_received", "unit_price_clp", "line_total_clp", "allocated_extra_cost_clp", "allocated_tax_clp", "real_unit_cost_clp", "suggested_sale_price_clp")


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    items = PurchaseOrderItemSerializer(many=True)
    order_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = PurchaseOrder
        fields = ("id", "order_number", "supplier", "supplier_name", "external_reference", "status", "source_store", "original_currency", "exchange_rate_snapshot_clp", "subtotal_original", "shipping_original", "sales_tax_original", "total_original", "import_duties_clp", "customs_fee_clp", "handling_fee_clp", "paypal_variation_clp", "other_costs_clp", "subtotal_clp", "shipping_clp", "sales_tax_clp", "total_origin_clp", "total_extra_costs_clp", "grand_total_clp", "real_total_clp", "notes", "update_prices_on_receive", "created_at", "received_at", "items")
        read_only_fields = ("exchange_rate_snapshot_clp", "subtotal_clp", "shipping_clp", "sales_tax_clp", "total_origin_clp", "total_extra_costs_clp", "grand_total_clp", "real_total_clp", "created_at", "received_at")

    def validate(self, attrs):
        items = attrs.get("items", [])
        if not attrs.get("supplier"):
            raise serializers.ValidationError({"supplier": ["Este campo es requerido."]})
        if not items:
            raise serializers.ValidationError({"items": ["Debes agregar al menos 1 item."]})
        currency = (attrs.get("original_currency") or "").upper()
        if currency not in ("CLP", "USD"):
            raise serializers.ValidationError({"original_currency": ["Debe ser CLP o USD"]})
        if currency == "USD":
            get_active_exchange_rate()
        for it in items:
            qty = int(it.get("quantity_ordered") or 0)
            if qty <= 0:
                raise serializers.ValidationError({"items": ["quantity_ordered debe ser mayor a 0."]})
            unit_price_original = it.get("unit_price_original")
            if unit_price_original is None or unit_price_original < 0:
                raise serializers.ValidationError({"items": ["unit_price_original debe ser mayor o igual a 0."]})
            expected = (unit_price_original * qty).quantize(Decimal("0.01"))
            if it.get("line_total_original") != expected:
                raise serializers.ValidationError({"items": ["line_total_original debe coincidir con quantity_ordered * unit_price_original"]})
        return attrs

    def _generate_order_number(self):
        date_prefix = timezone.localdate().strftime("%Y%m%d")
        base = f"PO-{date_prefix}-"
        last_po = PurchaseOrder.objects.filter(order_number__startswith=base).order_by("-order_number").first()
        seq = int(last_po.order_number.split("-")[-1]) + 1 if last_po else 1
        return f"{base}{seq:04d}"

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        validated_data["order_number"] = (validated_data.get("order_number") or "").strip() or self._generate_order_number()
        currency = validated_data.get("original_currency", "CLP")
        validated_data["exchange_rate_snapshot_clp"] = 1 if currency == "CLP" else get_active_exchange_rate()
        if validated_data.get("status") == PurchaseOrder.Status.RECEIVED:
            raise serializers.ValidationError({"status": ["No se puede crear recibida directamente"]})
        order = PurchaseOrder.objects.create(**validated_data)
        for it in items_data:
            PurchaseOrderItem.objects.create(purchase_order=order, **it)
        recalculate_purchase_order(order)
        return order
class KardexMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = KardexMovement
        fields = "__all__"


class PricingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSettings
        fields = "__all__"
