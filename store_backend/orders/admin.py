from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "unit_price_clp", "subtotal_clp", "product_name_snapshot", "product_type_snapshot")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "subtotal_clp", "total_clp", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("user__username",)
    inlines = [OrderItemInline]
