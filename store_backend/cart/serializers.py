from rest_framework import serializers

from products.models import Product

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit_price_clp = serializers.IntegerField(source="product.computed_price_clp", read_only=True)
    subtotal_clp = serializers.IntegerField(source="subtotal", read_only=True)

    class Meta:
        model = CartItem
        fields = ("id", "product", "product_name", "quantity", "unit_price_clp", "subtotal_clp")


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_clp = serializers.IntegerField(source="total", read_only=True)

    class Meta:
        model = Cart
        fields = ("id", "items", "total_clp", "updated_at")


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source="product")
    quantity = serializers.IntegerField(min_value=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
