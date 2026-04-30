from rest_framework import serializers

from .models import Category, MTGCard, PricingSettings, Product


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
        fields = ("id", "name", "usd_to_clp", "import_factor", "risk_factor", "margin_factor", "round_to", "is_active", "updated_at")
