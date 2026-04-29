from rest_framework import serializers

from .models import Category, MTGCard, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "is_active")


class MTGCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = MTGCard
        exclude = ("raw_data",)


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=Category.objects.all(), write_only=True, required=False, allow_null=True)
    mtg_card = MTGCardSerializer(read_only=True)
    mtg_card_id = serializers.PrimaryKeyRelatedField(source="mtg_card", queryset=MTGCard.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "description", "product_type", "price", "price_clp", "stock", "image", "is_active", "condition",
            "language", "is_foil", "edition", "notes", "created_at", "category", "category_id", "mtg_card", "mtg_card_id",
        )
        read_only_fields = ("created_at",)

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo")
        return value
