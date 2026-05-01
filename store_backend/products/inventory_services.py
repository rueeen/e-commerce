from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import logging
from .models import InventoryLot, KardexMovement, PricingSettings, Product, PurchaseOrder

PURCHASE_IN_TYPES = {KardexMovement.MovementType.PURCHASE_IN, KardexMovement.MovementType.MANUAL_IN, KardexMovement.MovementType.RETURN_IN}
OUT_TYPES = {KardexMovement.MovementType.SALE_OUT, KardexMovement.MovementType.MANUAL_OUT}
logger = logging.getLogger(__name__)

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
def consume_fifo_stock(product, quantity):
    qty_to_consume = int(quantity or 0)
    if qty_to_consume <= 0:
        raise ValidationError("quantity debe ser mayor a 0")

    product = Product.objects.select_for_update().get(pk=product.pk)
    lots = list(
        InventoryLot.objects.select_for_update()
        .filter(product=product, quantity_remaining__gt=0)
        .order_by("received_at", "id")
    )
    available = sum(lot.quantity_remaining for lot in lots)
    if available < qty_to_consume:
        raise ValidationError(f"Stock insuficiente para {product.name}.")

    total_cost_clp = 0
    remaining = qty_to_consume
    for lot in lots:
        if remaining == 0:
            break
        consumed = min(lot.quantity_remaining, remaining)
        lot.quantity_remaining -= consumed
        lot.save(update_fields=["quantity_remaining"])
        total_cost_clp += consumed * int(lot.unit_cost_clp)
        remaining -= consumed

    unit_cost_clp = int(round(total_cost_clp / qty_to_consume))
    return {"total_cost_clp": total_cost_clp, "unit_cost_clp": unit_cost_clp}

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
    movement = KardexMovement.objects.create(product=product, movement_type=movement_type, quantity=qty, previous_stock=previous_stock, new_stock=new_stock, unit_cost_clp=int(unit_cost_clp or 0), unit_price_clp=int(unit_price_clp or 0), reference_type=reference_type, reference_id=str(reference_id or ""), reference_label=reference_label or "", notes=notes or "", created_by=created_by)
    logger.info("Kardex movement created product_id=%s type=%s qty=%s previous_stock=%s new_stock=%s", product.pk, movement_type, qty, previous_stock, new_stock)
    return movement

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

    total_subtotal = sum(int(item.subtotal_clp or 0) for item in items)
    if total_subtotal <= 0:
        total_subtotal = sum(int(item.quantity_ordered) * int(item.unit_cost_clp or 0) for item in items)
    if total_subtotal <= 0:
        raise ValidationError("No se puede distribuir costos: subtotal de items inválido")

    total_usd_items = sum(float(item.unit_cost_usd or 0) * int(item.quantity_ordered) for item in items if float(item.unit_cost_usd or 0) > 0)
    po.subtotal_usd = round(total_usd_items, 2)
    po.exchange_rate = po.exchange_rate or settings.usd_to_clp_real or settings.usd_to_clp
    total_usd_paid = float(po.subtotal_usd) + float(po.shipping_usd or 0) + float(po.payment_fee_usd or 0)
    po.total_paid_clp = int(round(total_usd_paid * float(po.exchange_rate or 0)))
    po.total_real_clp = int(
        int(po.subtotal_clp or 0)
        + int(po.shipping_clp or 0)
        + int(po.import_fees_clp or 0)
        + int(po.taxes_clp or 0)
    )

    for item in items:
        qty = item.quantity_ordered - item.quantity_received
        if qty > 0:
            unit_cost_clp_base = int(item.unit_cost_clp or 0)
            item_subtotal = int(item.subtotal_clp or 0)
            if item_subtotal <= 0:
                item_subtotal = int(item.quantity_ordered) * unit_cost_clp_base
            if item_subtotal <= 0:
                raise ValidationError(f"Costo unitario inválido para {item.product.name}: requiere unit_cost_clp > 0 y subtotal válido")

            weight = item_subtotal / total_subtotal
            allocated_cost = int(round(weight * po.total_real_clp))
            unit_cost_real_clp = int(round(allocated_cost / int(item.quantity_ordered))) if int(item.quantity_ordered) > 0 else 0
            unit_cost_real_clp = max(1, unit_cost_real_clp)

            logger.info(
                "PO receive item pricing po_id=%s item_id=%s product_id=%s qty=%s unit_cost_clp_input=%s item_subtotal=%s total_subtotal=%s total_real_clp=%s unit_cost_real_clp=%s",
                po.pk,
                item.pk,
                item.product_id,
                item.quantity_ordered,
                unit_cost_clp_base,
                item_subtotal,
                total_subtotal,
                po.total_real_clp,
                unit_cost_real_clp,
            )

            if unit_cost_real_clp <= 0:
                raise ValidationError(f"Costo unitario CLP no válido (0) para {item.product.name}")
            item.unit_cost_clp = unit_cost_real_clp
            from .services import calculate_suggested_sale_price
            suggested_payload = calculate_suggested_sale_price(item.product, unit_cost_real_clp)
            suggested = int(suggested_payload.get("suggested_price_clp") or 0)
            min_allowed = int(suggested_payload.get("min_price_clp") or 0)
            create_stock_movement(product=item.product, movement_type=KardexMovement.MovementType.PURCHASE_IN, quantity=qty, created_by=user, unit_cost_clp=unit_cost_real_clp, reference_type="PURCHASE_ORDER", reference_id=po.id, reference_label=po.order_number, notes="Ingreso por recepción de orden de compra")
            InventoryLot.objects.create(
                product=item.product,
                purchase_order_item=item,
                quantity_initial=qty,
                quantity_remaining=qty,
                unit_cost_clp=unit_cost_real_clp,
                received_at=timezone.now(),
            )
            item.product.price_clp_suggested = int(suggested)
            if po.update_prices_on_receive and suggested > 0:
                item.product.price_clp = int(suggested)
                item.product.save(update_fields=["price_clp_suggested", "price_clp"])
            else:
                item.product.save(update_fields=["price_clp_suggested"])
            item.quantity_received = item.quantity_ordered
            item.subtotal_clp = item.quantity_ordered * item.unit_cost_clp
            item.save(update_fields=["quantity_received", "subtotal_clp", "unit_cost_clp"])
    po.status = PurchaseOrder.Status.RECEIVED
    po.received_at = timezone.now()
    po.save(update_fields=["status", "received_at", "updated_at", "subtotal_usd", "exchange_rate", "total_paid_clp", "total_real_clp"])
    logger.info("Purchase order received po_id=%s items=%s total_real_clp=%s", po.pk, len(items), po.total_real_clp)
    return po
