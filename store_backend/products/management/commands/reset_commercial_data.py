from django.core.management.base import BaseCommand
from django.db import transaction

from cart.models import Cart, CartItem
from orders.models import (
    AssistedPurchaseItem,
    AssistedPurchaseOrder,
    Order,
    OrderItem,
)
from products.models import (
    BundleItem,
    InventoryLot,
    KardexMovement,
    MTGCard,
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
)


class Command(BaseCommand):
    help = (
        "Limpia datos comerciales para reiniciar catálogo y operaciones: "
        "productos, órdenes y kardex. Conserva usuarios y proveedores."
    )

    def handle(self, *args, **options):
        purge_sequence = [
            (CartItem, "items de carrito"),
            (Cart, "carritos"),
            (AssistedPurchaseItem, "items de órdenes asistidas"),
            (AssistedPurchaseOrder, "órdenes asistidas"),
            (OrderItem, "items de órdenes"),
            (Order, "órdenes"),
            (BundleItem, "composiciones de bundles"),
            (InventoryLot, "lotes de inventario"),
            (KardexMovement, "movimientos de kardex"),
            (PurchaseOrderItem, "items de órdenes de compra"),
            (PurchaseOrder, "órdenes de compra"),
            (Product, "productos"),
            (MTGCard, "cartas MTG cacheadas"),
        ]

        with transaction.atomic():
            for model, label in purge_sequence:
                deleted_count, _ = model.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"{label}: {deleted_count} eliminados"))

        self.stdout.write(
            self.style.WARNING(
                "Limpieza completada. Se conservaron usuarios, proveedores, categorías y configuraciones."
            )
        )
