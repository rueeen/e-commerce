from django.core.management.base import BaseCommand
from products.models import Product, KardexMovement
from products.inventory_services import create_stock_movement


class Command(BaseCommand):
    help = "Inicializa Kardex para productos con stock existente"

    def handle(self, *args, **options):
        created = 0
        for product in Product.objects.filter(stock__gt=0):
            exists = KardexMovement.objects.filter(
                product=product,
                movement_type__in=[KardexMovement.MovementType.CORRECTION, KardexMovement.MovementType.ADJUSTMENT],
                previous_stock=0,
                new_stock=product.stock,
                reference_label="Saldo inicial por migración",
            ).exists()
            if exists:
                continue
            create_stock_movement(
                product=product,
                movement_type=KardexMovement.MovementType.CORRECTION,
                quantity=product.stock,
                reference_type="MIGRATION",
                reference_label="Saldo inicial por migración",
                notes="Inicialización de kardex desde stock histórico",
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Movimientos creados: {created}"))
