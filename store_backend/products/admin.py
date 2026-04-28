from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "product_type", "price", "stock", "is_active", "created_at")
    list_filter = ("product_type", "is_active", "category")
    search_fields = ("name", "description")
    list_editable = ("stock", "is_active")
