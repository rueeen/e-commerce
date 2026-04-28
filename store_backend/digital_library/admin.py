from django.contrib import admin

from .models import PurchaseDigitalAccess


@admin.register(PurchaseDigitalAccess)
class PurchaseDigitalAccessAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "purchased_at")
    search_fields = ("user__username", "product__name")
