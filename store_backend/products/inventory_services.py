from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import KardexMovement, Product, PurchaseOrder

PURCHASE_IN_TYPES = {KardexMovement.MovementType.PURCHASE_IN, KardexMovement.MovementType.MANUAL_IN, KardexMovement.MovementType.RETURN_IN}
OUT_TYPES = {KardexMovement.MovementType.SALE_OUT, KardexMovement.MovementType.MANUAL_OUT}

def _recalculate_average_cost(product, incoming_qty, incoming_cost):
    previous_stock = int(product.stock)
    previous_avg = int(product.average_cost_clp or 0)
    denominator = previous_stock + int(incoming_qty)
    if denominator <= 0:
        return 0
    return int(round(((previous_stock * previous_avg) + (int(incoming_qty) * int(incoming_cost or 0))) / denominator))

@transaction.atomic
def create_stock_movement(*, product, movement_type, quantity, created_by=None, unit_cost_clp=0, unit_price_clp=0, reference_type="", reference_id="", reference_label="", notes=""):
    if quantity <= 0:
        raise ValidationError("quantity debe ser mayor a 0")
    product = Product.objects.select_for_update().get(pk=product.pk)
    previous_stock = int(product.stock)
    qty = int(quantity)
    if movement_type in PURCHASE_IN_TYPES:
        new_stock = previous_stock + qty
    elif movement_type in OUT_TYPES:
        if previous_stock < qty:
            raise ValidationError("No hay stock suficiente para este movimiento")
        new_stock = previous_stock - qty
    elif movement_type in {KardexMovement.MovementType.ADJUSTMENT, KardexMovement.MovementType.CORRECTION}:
        new_stock = qty
        qty = abs(new_stock - previous_stock)
    else:
        raise ValidationError("movement_type inválido")
    if movement_type == KardexMovement.MovementType.PURCHASE_IN:
        product.average_cost_clp = _recalculate_average_cost(product, quantity, unit_cost_clp)
        product.last_purchase_cost_clp = int(unit_cost_clp or 0)
    product.stock = new_stock
    product.save(update_fields=["stock", "average_cost_clp", "last_purchase_cost_clp"])
    return KardexMovement.objects.create(product=product, movement_type=movement_type, quantity=qty, previous_stock=previous_stock, new_stock=new_stock, unit_cost_clp=int(unit_cost_clp or 0), unit_price_clp=int(unit_price_clp or 0), reference_type=reference_type, reference_id=str(reference_id or ""), reference_label=reference_label or "", notes=notes or "", created_by=created_by)

@transaction.atomic
def receive_purchase_order(purchase_order_id, user):
    po = PurchaseOrder.objects.select_for_update().prefetch_related("items__product").get(pk=purchase_order_id)
    if po.status == PurchaseOrder.Status.RECEIVED:
        raise ValidationError("La orden ya fue recibida")
    for item in po.items.all():
        qty = item.quantity_ordered - item.quantity_received
        if qty > 0:
            create_stock_movement(product=item.product, movement_type=KardexMovement.MovementType.PURCHASE_IN, quantity=qty, created_by=user, unit_cost_clp=item.unit_cost_clp, reference_type="purchase_order", reference_id=po.id, reference_label=po.order_number, notes="Ingreso por recepción de orden de compra")
            item.quantity_received = item.quantity_ordered
            item.subtotal_clp = item.quantity_ordered * item.unit_cost_clp
            item.save(update_fields=["quantity_received", "subtotal_clp"])
    po.status = PurchaseOrder.Status.RECEIVED
    po.received_at = timezone.now()
    po.save(update_fields=["status", "received_at", "updated_at"])
    return po
