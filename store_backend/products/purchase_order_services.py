from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .inventory_services import create_stock_movement
from .models import ExchangeRateConfig, InventoryLot, KardexMovement, PricingSettings, Product, PurchaseOrder

D = Decimal


def _d(v):
    return D(str(v or 0))


def _q2(v):
    return _d(v).quantize(D("0.01"), rounding=ROUND_HALF_UP)


def _clp(v):
    return int(_d(v).quantize(D("1"), rounding=ROUND_HALF_UP))


def get_active_exchange_rate():
    ps = PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first()
    if ps and ps.usd_to_clp:
        return _q2(ps.usd_to_clp)
    conf = ExchangeRateConfig.objects.filter(is_active=True).order_by("-updated_at", "-id").first()
    if conf and conf.usd_to_clp:
        return _q2(conf.usd_to_clp)
    raise ValidationError("No existe un tipo de cambio activo")


def convert_money_to_clp(amount, currency, exchange_rate):
    if (currency or "CLP").upper() == "CLP":
        return _clp(amount)
    if (currency or "").upper() != "USD":
        raise ValidationError("Moneda no soportada")
    if _d(exchange_rate) <= 0:
        raise ValidationError("Tipo de cambio inválido")
    return _clp(_d(amount) * _d(exchange_rate))


def calculate_suggested_price(real_unit_cost_clp, margin_percent, rounding_to):
    raw = _d(real_unit_cost_clp) * (D("1") + (_d(margin_percent) / D("100")))
    step = max(int(rounding_to or 100), 1)
    return int((raw / D(step)).quantize(D("1"), rounding=ROUND_HALF_UP) * D(step))


def calculate_purchase_order_totals(order):
    rate = _d(order.exchange_rate_snapshot_clp or 1)
    subtotal_clp = 0
    for item in order.items.all():
        line_clp = convert_money_to_clp(item.line_total_original, order.original_currency, rate)
        item.line_total_clp = line_clp
        item.unit_price_clp = _clp(_d(line_clp) / _d(item.quantity_ordered or 1))
        item.save(update_fields=["line_total_clp", "unit_price_clp"])
        subtotal_clp += line_clp

    shipping_clp = convert_money_to_clp(order.shipping_original, order.original_currency, rate)
    sales_tax_clp = convert_money_to_clp(order.sales_tax_original, order.original_currency, rate)
    total_origin_clp = subtotal_clp + shipping_clp + sales_tax_clp
    total_extra = shipping_clp + sales_tax_clp + int(order.import_duties_clp or 0) + int(order.customs_fee_clp or 0) + int(order.handling_fee_clp or 0) + int(order.paypal_variation_clp or 0) + int(order.other_costs_clp or 0)
    real_total = subtotal_clp + total_extra
    return dict(subtotal_clp=subtotal_clp, shipping_clp=shipping_clp, sales_tax_clp=sales_tax_clp, total_origin_clp=total_origin_clp, total_extra_costs_clp=total_extra, grand_total_clp=real_total, real_total_clp=real_total)


def allocate_extra_costs(order):
    items = list(order.items.all().order_by("id"))
    subtotal = int(order.subtotal_clp or 0)
    total_extra = int(order.total_extra_costs_clp or 0)
    if subtotal <= 0 or not items:
        return
    allocated = 0
    for idx, item in enumerate(items):
        if idx == len(items) - 1:
            share = total_extra - allocated
        else:
            share = _clp(_d(total_extra) * (_d(item.line_total_clp) / _d(subtotal)))
            allocated += share
        item.allocated_extra_cost_clp = max(0, share)
        item.allocated_tax_clp = 0
        item.real_unit_cost_clp = _clp((_d(item.line_total_clp) + _d(item.allocated_extra_cost_clp)) / _d(item.quantity_ordered))
        rounding_to = getattr(PricingSettings.objects.filter(is_active=True).order_by("-updated_at").first(), "rounding_to", 100)
        item.suggested_sale_price_clp = calculate_suggested_price(item.real_unit_cost_clp, item.margin_percent, rounding_to)
        item.save(update_fields=["allocated_extra_cost_clp", "allocated_tax_clp", "real_unit_cost_clp", "suggested_sale_price_clp"])


def recalculate_purchase_order(order):
    totals = calculate_purchase_order_totals(order)
    for k, v in totals.items():
        setattr(order, k, v)
    order.save(update_fields=list(totals.keys()))
    allocate_extra_costs(order)
    return order


@transaction.atomic
def receive_purchase_order(order, user):
    po = PurchaseOrder.objects.select_for_update().prefetch_related("items__product").get(pk=order.pk)
    if po.status == PurchaseOrder.Status.CANCELLED:
        raise ValidationError("No permitir recibir orden CANCELLED")
    if po.status == PurchaseOrder.Status.RECEIVED:
        raise ValidationError("No permitir recibir dos veces")
    recalculate_purchase_order(po)
    items = list(po.items.all())
    if not items:
        raise ValidationError("No se puede recibir orden sin items")
    for item in items:
        if int(item.quantity_ordered or 0) <= 0:
            raise ValidationError("quantity_ordered debe ser mayor a 0")
        if not item.product:
            continue
        qty = int(item.quantity_ordered - item.quantity_received)
        if qty <= 0:
            continue
        unit_cost = int(item.real_unit_cost_clp or item.unit_price_clp or 0)
        create_stock_movement(item.product, KardexMovement.MovementType.PURCHASE_IN, qty, user, unit_cost_clp=unit_cost, reference_type="PURCHASE_ORDER", reference_id=po.id, reference_label=po.order_number, notes="Ingreso por recepción de orden de compra")
        InventoryLot.objects.create(product=item.product, purchase_order_item=item, quantity_initial=qty, quantity_remaining=qty, unit_cost_clp=max(1, unit_cost), received_at=timezone.now())
        Product.objects.filter(pk=item.product_id).update(last_purchase_cost_clp=unit_cost, average_cost_clp=unit_cost)
        if po.update_prices_on_receive:
            sp = int(item.sale_price_to_apply_clp or item.suggested_sale_price_clp or 0)
            if sp > 0:
                Product.objects.filter(pk=item.product_id).update(price_clp=sp, price_clp_suggested=sp)
        item.quantity_received = item.quantity_ordered
        item.save(update_fields=["quantity_received"])
    po.status = PurchaseOrder.Status.RECEIVED
    po.received_at = timezone.now()
    po.received_by = user
    po.save(update_fields=["status", "received_at", "received_by"])
    return po
