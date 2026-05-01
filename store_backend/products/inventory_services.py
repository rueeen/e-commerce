from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import KardexMovement, PricingSettings, Product, PurchaseOrder
from .services import calculate_suggested_sale_price

PURCHASE_IN_TYPES = {KardexMovement.MovementType.PURCHASE_IN, KardexMovement.MovementType.MANUAL_IN, KardexMovement.MovementType.RETURN_IN}
OUT_TYPES = {KardexMovement.MovementType.SALE_OUT, KardexMovement.MovementType.MANUAL_OUT}

def _recalculate_average_cost(product, incoming_qty, incoming_cost):
    previous_stock = int(product.stock)
    previous_avg = int(product.average_cost_clp or 0)
    denominator = previous_stock + int(incoming_qty)
    if denominator <= 0:
        return 0
    return int(round(((previous_stock * previous_avg) + (int(incoming_qty) * int(incoming_cost or 0))) / denominator))


def _round_to(value, rounding_to):
    base = int(rounding_to or 1)
    if base <= 1:
        return int(round(value))
    return int(round(float(value) / base) * base)


def _get_active_pricing_settings():
    return PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first() or PricingSettings()

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
    if po.status == PurchaseOrder.Status.CANCELLED:
        raise ValidationError("No se puede recibir una orden cancelada")
    settings = _get_active_pricing_settings()
    items = list(po.items.all())
    if not items:
        raise ValidationError("No se puede recibir una orden sin items")

    if not any((item.quantity_ordered - item.quantity_received) > 0 for item in items):
        raise ValidationError("No hay cantidades pendientes por recibir")

    total_usd_items = sum(float(item.unit_cost_usd or 0) * int(item.quantity_ordered) for item in items)
    po.subtotal_usd = round(total_usd_items, 2)
    po.exchange_rate = po.exchange_rate or settings.usd_to_clp_real or settings.usd_to_clp
    total_usd_paid = float(po.subtotal_usd) + float(po.shipping_usd or 0) + float(po.payment_fee_usd or 0)
    po.total_paid_clp = int(round(total_usd_paid * float(po.exchange_rate or 0)))
    po.total_real_clp = int(po.total_paid_clp + int(po.customs_clp or 0) + int(po.handling_clp or 0) + int(po.other_costs_clp or 0))

    for item in items:
        qty = item.quantity_ordered - item.quantity_received
        if qty > 0:
            item_total_usd = float(item.unit_cost_usd or 0) * int(item.quantity_ordered)
            weight = (item_total_usd / total_usd_items) if total_usd_items > 0 else 0
            allocated_cost = int(round(weight * po.total_real_clp))
            unit_cost_real_clp = int(round(allocated_cost / item.quantity_ordered))
            if unit_cost_real_clp <= 0:
                raise ValidationError(f"Costo unitario CLP no válido (0) para {item.product.name}")
            item.unit_cost_clp = unit_cost_real_clp
            suggested_payload = calculate_suggested_sale_price(item.product, unit_cost_real_clp)
            suggested = int(suggested_payload.get("suggested_price_clp") or 0)
            min_allowed = int(suggested_payload.get("min_price_clp") or 0)
            if item.product.price_clp_final and item.product.price_clp_final < min_allowed:
                raise ValidationError(f"Precio por debajo del margen mínimo para {item.product.name}")
            create_stock_movement(product=item.product, movement_type=KardexMovement.MovementType.PURCHASE_IN, quantity=qty, created_by=user, unit_cost_clp=unit_cost_real_clp, reference_type="PURCHASE_ORDER", reference_id=po.id, reference_label=po.order_number, notes="Ingreso por recepción de orden de compra")
            item.product.price_clp_suggested = int(suggested)
            if po.update_prices_on_receive and suggested > 0:
                item.product.price_clp_final = int(suggested)
                item.product.price_clp = int(suggested)
                item.product.price = int(suggested)
                item.product.save(update_fields=["price_clp_suggested", "price_clp_final", "price_clp", "price"])
            else:
                item.product.save(update_fields=["price_clp_suggested"])
            item.quantity_received = item.quantity_ordered
            item.subtotal_clp = item.quantity_ordered * item.unit_cost_clp
            item.save(update_fields=["quantity_received", "subtotal_clp", "unit_cost_clp"])
    po.status = PurchaseOrder.Status.RECEIVED
    po.received_at = timezone.now()
    po.save(update_fields=["status", "received_at", "updated_at", "subtotal_usd", "exchange_rate", "total_paid_clp", "total_real_clp"])
    return po
