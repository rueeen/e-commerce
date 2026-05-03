from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import KardexMovement, PricingSettings, Product, PurchaseOrder
from .inventory_services import create_stock_movement

D = Decimal


def _d(v):
    return D(str(v or 0))


def _round_money(v):
    return _d(v).quantize(D('0.01'), rounding=ROUND_HALF_UP)


def _item_field_names(item):
    return {f.name for f in item._meta.fields}


def _save_item_fields(item, candidate_fields):
    available_fields = _item_field_names(item)
    update_fields = [field for field in candidate_fields if field in available_fields]
    if update_fields:
        item.save(update_fields=update_fields)
    else:
        item.save()


def calculate_suggested_price(real_unit_cost, margin_percent, rounding_to=100):
    price = _d(real_unit_cost) * (D('1') + (_d(margin_percent) / D('100')))
    rounded = int((price / D(str(rounding_to))).quantize(D('1'), rounding=ROUND_HALF_UP) * D(str(rounding_to)))
    return max(0, rounded)


def calculate_purchase_order_totals(order):
    items = list(order.items.all())
    subtotal_products = sum((_d(i.quantity_ordered) * _d(i.unit_cost_clp) for i in items), D('0'))
    extra_costs = _d(order.shipping_clp) + _d(order.import_fees_clp) + _d(order.customs_clp) + _d(order.handling_clp) + _d(order.other_costs_clp)
    taxable_base = subtotal_products + extra_costs
    tax_amount = taxable_base * (_d(order.tax_rate_percent or 19) / D('100'))
    return {
        'subtotal_products': _round_money(subtotal_products),
        'extra_costs': _round_money(extra_costs),
        'taxable_base': _round_money(taxable_base),
        'tax_amount': _round_money(tax_amount),
        'grand_total': _round_money(taxable_base + tax_amount),
    }


def allocate_extra_costs(order):
    items = list(order.items.all())
    totals = calculate_purchase_order_totals(order)
    subtotal = totals['subtotal_products']
    alloc_base = totals['extra_costs'] + totals['tax_amount']
    if subtotal <= 0:
        for i in items:
            i.allocated_extra_cost_clp = 0
            i.real_unit_cost_clp = int(i.unit_cost_clp or 0)
            _save_item_fields(i, ['allocated_extra_cost_clp', 'real_unit_cost_clp'])
        return totals
    for i in items:
        item_sub = _d(i.quantity_ordered) * _d(i.unit_cost_clp)
        ratio = item_sub / subtotal
        allocated = (alloc_base * ratio).quantize(D('1'), rounding=ROUND_HALF_UP)
        i.allocated_extra_cost_clp = int(allocated)
        real_total = item_sub + allocated
        i.real_unit_cost_clp = int((real_total / _d(i.quantity_ordered)).quantize(D('1'), rounding=ROUND_HALF_UP))
        margin = _d(getattr(i, 'margin_percent', 35) or 35)
        settings = PricingSettings.objects.filter(is_active=True).order_by('-updated_at').first()
        rounding_to = int(getattr(settings, 'rounding_to', 100) or 100)
        i.suggested_sale_price_clp = calculate_suggested_price(i.real_unit_cost_clp, margin, rounding_to)
        _save_item_fields(i, ['allocated_extra_cost_clp', 'real_unit_cost_clp', 'suggested_sale_price_clp'])
    return totals


@transaction.atomic
def receive_purchase_order(order, user):
    po = PurchaseOrder.objects.select_for_update().prefetch_related('items__product').get(pk=order.pk)
    if po.status == PurchaseOrder.Status.RECEIVED:
        raise ValidationError('La orden ya fue recibida')
    if po.status == PurchaseOrder.Status.CANCELLED:
        raise ValidationError('No se puede recibir una orden cancelada')
    items = list(po.items.all())
    if not items:
        raise ValidationError('No se puede recibir orden sin items')
    if any(int(i.quantity_ordered or 0) <= 0 for i in items):
        raise ValidationError('Todos los items deben tener cantidad mayor a 0')

    totals = allocate_extra_costs(po)
    po.subtotal_clp = int(totals['subtotal_products'])
    po.taxes_clp = int(totals['tax_amount'])
    po.total_clp = int(totals['grand_total'])
    po.total_real_clp = int(totals['grand_total'])

    for item in items:
        qty = int(item.quantity_ordered - item.quantity_received)
        if qty <= 0:
            continue
        unit_cost = int(item.real_unit_cost_clp or item.unit_cost_clp or 0)
        if unit_cost <= 0:
            raise ValidationError(f'Costo unitario inválido para {item.product.name}')
        create_stock_movement(product=item.product, movement_type=KardexMovement.MovementType.PURCHASE_IN, quantity=qty, created_by=user, unit_cost_clp=unit_cost, reference_type='PURCHASE_ORDER', reference_id=po.id, reference_label=po.order_number, notes='Ingreso por recepción de orden de compra')
        Product.objects.filter(pk=item.product_id).update(last_purchase_cost_clp=unit_cost)
        if po.update_prices_on_receive:
            sale_price = int(item.sale_price_to_apply_clp or item.suggested_sale_price_clp or 0)
            if sale_price > 0:
                Product.objects.filter(pk=item.product_id).update(price_clp=sale_price, price_clp_suggested=sale_price)
        item.quantity_received = item.quantity_ordered
        item.save(update_fields=['quantity_received'])

    po.status = PurchaseOrder.Status.RECEIVED
    po.received_at = timezone.now()
    po.received_by = user
    po.save(update_fields=['status', 'received_at', 'received_by', 'subtotal_clp', 'taxes_clp', 'total_clp', 'total_real_clp'])
    return po
