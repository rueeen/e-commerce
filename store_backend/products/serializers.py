from rest_framework import serializers

from .models import MTGCard, Product


class MTGCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = MTGCard
        exclude = ("raw_data",)


class ProductSerializer(serializers.ModelSerializer):
    mtg_card = MTGCardSerializer(read_only=True)
    mtg_card_id = serializers.PrimaryKeyRelatedField(source="mtg_card", queryset=MTGCard.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "description", "product_type", "price", "price_clp", "stock", "image", "is_active", "condition",
            "language", "is_foil", "edition", "notes", "created_at", "mtg_card", "mtg_card_id",
        )
        read_only_fields = ("created_at",)
