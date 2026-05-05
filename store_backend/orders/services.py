from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from cart.models import Cart
from products.inventory_services import consume_fifo_stock, create_stock_movement
from products.models import KardexMovement, Product

from .models import Order, OrderItem


def _validation_error_message(exc):
    if hasattr(exc, "message"):
        return exc.message

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


@transaction.atomic
def create_order_from_cart(user):
    """
    Crea una orden desde el carrito.

    Importante:
    - Congela precios.
    - No descuenta stock.
    - No crea Kardex.
    - Vacía el carrito.
    """
    cart, _ = Cart.objects.select_for_update().get_or_create(user=user)

    items = list(
        cart.items.select_related("product")
    )

    if not items:
        raise ValidationError("Carrito vacío.")

    order = Order.objects.create(
        user=user,
        status=Order.Status.PENDING,
    )

    subtotal = 0

    for item in items:
        product = Product.objects.select_for_update().get(pk=item.product_id)

        if not product.is_active:
            raise ValidationError(f"Producto inactivo: {product.name}")

        if product.stock < item.quantity:
            raise ValidationError(f"Stock insuficiente para {product.name}.")

        unit_price = int(product.computed_price_clp or product.price_clp or 0)

        if unit_price <= 0:
            raise ValidationError(
                f"Producto sin precio válido: {product.name}")

        line_subtotal = unit_price * item.quantity

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name_snapshot=product.name,
            product_type_snapshot=product.product_type,
            quantity=item.quantity,
            unit_price_clp=unit_price,
            subtotal_clp=line_subtotal,
            unit_cost_clp=0,
            total_cost_clp=0,
            gross_profit_clp=0,
        )

        subtotal += line_subtotal

    order.subtotal_clp = subtotal
    order.total_clp = max(
        subtotal + order.shipping_clp - order.discount_clp,
        0,
    )
    order.save(update_fields=["subtotal_clp", "total_clp", "updated_at"])

    cart.items.all().delete()

    return order


@transaction.atomic
def confirm_order_payment(order: Order, user=None):
    """
    Confirma una orden pagada.

    Aquí recién:
    - Se consume stock FIFO.
    - Se crea movimiento Kardex SALE_OUT.
    - Se calculan costos y utilidad.
    """
    order = Order.objects.select_for_update().get(pk=order.pk)

    if not order.can_be_paid:
        raise ValidationError("Solo se pueden pagar órdenes pendientes.")

    if order.stock_consumed:
        raise ValidationError("El stock de esta orden ya fue consumido.")

    for item in order.items.select_related("product"):
        product = Product.objects.select_for_update().get(pk=item.product_id)

        if not product.is_active:
            raise ValidationError(f"Producto inactivo: {product.name}")

        if product.stock < item.quantity:
            raise ValidationError(f"Stock insuficiente para {product.name}.")

        fifo_cost = consume_fifo_stock(product, item.quantity)

        total_cost_clp = int(fifo_cost["total_cost_clp"])
        unit_cost_clp = int(fifo_cost["unit_cost_clp"])
        gross_profit_clp = item.subtotal_clp - total_cost_clp

        item.unit_cost_clp = unit_cost_clp
        item.total_cost_clp = total_cost_clp
        item.gross_profit_clp = gross_profit_clp
        item.save(
            update_fields=[
                "unit_cost_clp",
                "total_cost_clp",
                "gross_profit_clp",
            ]
        )

        create_stock_movement(
            product=product,
            movement_type=KardexMovement.MovementType.SALE_OUT,
            quantity=item.quantity,
            created_by=user,
            unit_cost_clp=unit_cost_clp,
            unit_price_clp=item.unit_price_clp,
            reference_type="ORDER",
            reference_id=order.id,
            reference_label=f"Orden #{order.id}",
            notes="Salida por venta confirmada",
        )

    order.status = Order.Status.PAID
    order.stock_consumed = True
    order.paid_at = timezone.now()
    order.save(
        update_fields=[
            "status",
            "stock_consumed",
            "paid_at",
            "updated_at",
        ]
    )

    return order


@transaction.atomic
def cancel_order(order: Order, user=None):
    """
    Cancela una orden.

    Si la orden ya consumió stock, se genera RETURN_IN.
    Si estaba pendiente y nunca consumió stock, solo cambia estado.
    """
    order = Order.objects.select_for_update().get(pk=order.pk)

    if order.status == Order.Status.CANCELED:
        return order

    if not order.can_be_canceled:
        raise ValidationError("Esta orden no puede ser cancelada.")

    if order.stock_consumed:
        for item in order.items.select_related("product"):
            create_stock_movement(
                product=item.product,
                movement_type=KardexMovement.MovementType.RETURN_IN,
                quantity=item.quantity,
                created_by=user,
                unit_cost_clp=item.unit_cost_clp,
                unit_price_clp=item.unit_price_clp,
                reference_type="ORDER",
                reference_id=order.id,
                reference_label=f"Orden #{order.id}",
                notes="Reposición por cancelación de orden",
            )

    order.status = Order.Status.CANCELED
    order.cancelled_at = timezone.now()
    order.save(
        update_fields=[
            "status",
            "cancelled_at",
            "updated_at",
        ]
    )

    return order
