from rest_framework import serializers

from .models import Category, KardexMovement, MTGCard, PricingSettings, Product


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
            "id", "name", "description", "product_type", "price", "price_clp", "stock", "image", "is_active", "condition",
            "language", "is_foil", "edition", "notes", "price_usd_reference", "price_clp_suggested", "price_clp_final", "pricing_source", "pricing_last_update", "created_at", "mtg_card", "mtg_card_id", "category", "category_id",
        )
        read_only_fields = ("created_at",)


class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "is_active", "products_count", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")


class PricingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingSettings
        fields = ("id", "name", "usd_to_clp", "import_factor", "risk_factor", "margin_factor", "rounding_to", "is_active", "created_at", "updated_at")

    def validate_usd_to_clp(self, value):
        if value <= 0:
            raise serializers.ValidationError("usd_to_clp debe ser mayor que 0")
        return value

    def validate(self, attrs):
        for key in ["import_factor", "risk_factor", "margin_factor"]:
            if key in attrs and attrs[key] < 1:
                raise serializers.ValidationError({key: "Debe ser mayor o igual a 1"})
        if "rounding_to" in attrs and attrs["rounding_to"] not in {10, 50, 100, 500, 1000}:
            raise serializers.ValidationError({"rounding_to": "Debe ser uno de: 10, 50, 100, 500, 1000"})
        return attrs


class KardexMovementSerializer(serializers.ModelSerializer):
    producto = serializers.CharField(source="product.name", read_only=True)
    tipo_movimiento = serializers.CharField(source="movement_type", read_only=True)
    stock_anterior = serializers.IntegerField(source="previous_stock", read_only=True)
    stock_nuevo = serializers.IntegerField(source="new_stock", read_only=True)
    costo_unitario = serializers.IntegerField(source="unit_cost_clp", read_only=True)
    precio_unitario = serializers.IntegerField(source="unit_price_clp", read_only=True)
    usuario = serializers.CharField(source="created_by.username", read_only=True)
    fecha = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = KardexMovement
        fields = (
            "id", "product", "producto", "movement_type", "tipo_movimiento", "quantity", "stock_anterior", "stock_nuevo",
            "costo_unitario", "precio_unitario", "reference", "notes", "usuario", "fecha",
            "previous_stock", "new_stock", "unit_cost_clp", "unit_price_clp", "created_by", "created_at",
        )
        read_only_fields = ("previous_stock", "new_stock", "created_by", "created_at")
