from django.core.exceptions import ValidationError

from .models import KardexMovement


def create_kardex_movement(*, product, movement_type, quantity, created_by=None, unit_cost_clp=0, unit_price_clp=0, reference="", notes=""):
    if quantity <= 0:
        raise ValidationError("quantity debe ser mayor a 0")
    previous_stock = int(product.stock)
    if movement_type in {KardexMovement.MovementType.IN, KardexMovement.MovementType.RETURN}:
        new_stock = previous_stock + quantity
    elif movement_type in {KardexMovement.MovementType.OUT, KardexMovement.MovementType.SALE, KardexMovement.MovementType.CORRECTION}:
        new_stock = previous_stock - quantity
    elif movement_type == KardexMovement.MovementType.ADJUSTMENT:
        new_stock = quantity
        quantity = abs(new_stock - previous_stock) or 1
    else:
        raise ValidationError("movement_type inválido")
    if new_stock < 0:
        raise ValidationError("No hay stock suficiente para este movimiento")
    product.stock = new_stock
    product.save(update_fields=["stock"])
    return KardexMovement.objects.create(product=product, movement_type=movement_type, quantity=quantity, previous_stock=previous_stock, new_stock=new_stock, unit_cost_clp=unit_cost_clp or 0, unit_price_clp=unit_price_clp or 0, reference=reference or "", notes=notes or "", created_by=created_by)
