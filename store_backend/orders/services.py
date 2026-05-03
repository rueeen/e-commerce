from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from cart.models import Cart
from products.inventory_services import consume_fifo_stock, create_stock_movement
from products.models import KardexMovement, Product

from .models import Order, OrderItem


@transaction.atomic
def create_order_from_cart(user):
    """Create an order from the cart and consume stock once using FIFO + kardex sale movement."""
    cart, _ = Cart.objects.select_for_update().get_or_create(user=user)
    items = list(cart.items.select_related("product"))
    if not items:
        raise ValidationError("Carrito vacío.")

    order = Order.objects.create(user=user, status=Order.Status.PENDING)
    subtotal = 0

    for item in items:
        product = Product.objects.select_for_update().get(pk=item.product_id)
        if not product.is_active:
            raise ValidationError(f"Producto inactivo: {product.name}")
        if product.stock < item.quantity:
            raise ValidationError(f"Stock insuficiente para {product.name}.")

        unit_price = int(product.computed_price_clp or product.price_clp)
        line_subtotal = unit_price * item.quantity
        fifo_cost = consume_fifo_stock(product, item.quantity)
        total_cost_clp = int(fifo_cost["total_cost_clp"])
        unit_cost_clp = int(fifo_cost["unit_cost_clp"])
        gross_profit_clp = line_subtotal - total_cost_clp

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            product_type_snapshot=product.product_type,
            quantity=item.quantity,
            unit_price_clp=unit_price,
            subtotal_clp=line_subtotal,
            unit_cost_clp=unit_cost_clp,
            total_cost_clp=total_cost_clp,
            gross_profit_clp=gross_profit_clp,
        )

        create_stock_movement(
            product=product,
            movement_type=KardexMovement.MovementType.SALE_OUT,
            quantity=item.quantity,
            created_by=user,
            unit_cost_clp=unit_cost_clp,
            unit_price_clp=unit_price,
            reference_type="ORDER",
            reference_id=order.id,
            reference_label=f"Orden #{order.id}",
            notes="Salida por venta",
        )
        subtotal += line_subtotal

    order.subtotal_clp = subtotal
    order.total_clp = subtotal + order.shipping_clp - order.discount_clp
    order.save(update_fields=["subtotal_clp", "total_clp", "updated_at"])
    cart.items.all().delete()
    return order


@transaction.atomic
def cancel_order(order: Order, user=None):
    if order.status == Order.Status.CANCELED:
        return order
    for item in order.items.select_related("product"):
        create_stock_movement(
            product=item.product,
            movement_type=KardexMovement.MovementType.RETURN_IN,
            quantity=item.quantity,
            created_by=user,
            unit_price_clp=item.unit_price_clp,
            reference_type="ORDER",
            reference_id=order.id,
            reference_label=f"Orden #{order.id}",
            notes="Reposición por cancelación",
        )
    order.status = Order.Status.CANCELED
    order.cancelled_at = timezone.now()
    order.save(update_fields=["status", "cancelled_at", "updated_at"])
    return order
