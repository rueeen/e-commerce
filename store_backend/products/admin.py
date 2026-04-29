from django.contrib import admin

from .models import ExchangeRateConfig, MTGCard, Product, ServiceFeeConfig, ShippingConfig, Supplier

admin.site.register(MTGCard)
admin.site.register(Product)
admin.site.register(Supplier)
admin.site.register(ExchangeRateConfig)
admin.site.register(ServiceFeeConfig)
admin.site.register(ShippingConfig)
