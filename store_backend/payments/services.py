import json
import urllib.error
import urllib.request
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from cart.models import Cart
from orders.models import Order
from orders.services import confirm_order_payment
from products.models import KardexMovement

from .models import PaymentTransaction, SalesReceipt


def _webpay_base_url():
    return 'https://webpay3gint.transbank.cl' if settings.WEBPAY_ENVIRONMENT == 'integration' else 'https://webpay3g.transbank.cl'


def _headers():
    return {
        'Tbk-Api-Key-Id': settings.WEBPAY_COMMERCE_CODE,
        'Tbk-Api-Key-Secret': settings.WEBPAY_API_KEY_SECRET,
        'Content-Type': 'application/json',
    }


def _request(path, payload=None, method='POST'):
    body = None if payload is None else json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{_webpay_base_url()}{path}",
        data=body,
        headers=_headers(),
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='ignore') if hasattr(exc, 'read') else ''
        details = body or str(exc)
        if exc.code == 401:
            message = (
                f'Webpay rechazó la solicitud (401). Posible problema de credenciales para el ambiente '
                f'"{settings.WEBPAY_ENVIRONMENT}".'
            )
        elif exc.code == 405:
            message = 'Webpay rechazó la solicitud (405). Método HTTP o endpoint de commit incorrecto.'
        elif exc.code in (404, 422):
            message = 'Webpay rechazó la solicitud. El token es inválido, expiró o ya fue confirmado.'
        else:
            message = f'Webpay rechazó la solicitud ({exc.code}).'
        raise ValidationError(f'{message} Detalle técnico: {details}') from exc
    except urllib.error.URLError as exc:
        raise ValidationError(f'No fue posible conectar con Webpay: {exc.reason}') from exc


def create_webpay_transaction(order, user):
    if order.user_id != user.id:
        raise ValidationError('No autorizado para pagar esta orden.')
    payable_statuses = {Order.Status.PENDING_PAYMENT, Order.Status.PAYMENT_FAILED}
    if order.status not in payable_statuses:
        raise ValidationError('Solo se pueden pagar órdenes pendientes o con pago fallido.')
    if order.total_clp <= 0:
        raise ValidationError('La orden no tiene monto válido.')

    buy_order = f'ORDER-{order.id}-{timezone.now().strftime("%Y%m%d%H%M%S")}'
    session_id = f'user-{user.id}-order-{order.id}'
    payload = {
        'buy_order': buy_order,
        'session_id': session_id,
        'amount': int(order.total_clp),
        'return_url': settings.WEBPAY_RETURN_URL,
    }
    response = _request('/rswebpaytransaction/api/webpay/v1.2/transactions', payload, method='POST')

    payment = PaymentTransaction.objects.create(
        order=order,
        user=user,
        status=PaymentTransaction.Status.PENDING,
        amount_clp=order.total_clp,
        buy_order=buy_order,
        session_id=session_id,
        token=response['token'],
        raw_request=payload,
        raw_response=response,
    )
    order.status = getattr(Order.Status, 'AWAITING_PAYMENT', Order.Status.PAYMENT_STARTED)
    order.save(update_fields=['status', 'updated_at'])
    return payment, response


def commit_webpay_transaction(token):
    return _request(f'/rswebpaytransaction/api/webpay/v1.2/transactions/{token}', {}, method='PUT')


@transaction.atomic
def finalize_paid_order(order, payment):
    locked = Order.objects.select_for_update().get(pk=order.pk)
    if locked.status == Order.Status.PAID:
        return locked
    if payment.status != PaymentTransaction.Status.AUTHORIZED:
        raise ValidationError('Transacción no autorizada.')
    if KardexMovement.objects.filter(reference_type='ORDER', reference_id=locked.id, movement_type=KardexMovement.MovementType.SALE_OUT).exists():
        locked.status = Order.Status.PAID
        locked.stock_consumed = True
        locked.save(update_fields=['status', 'stock_consumed', 'updated_at'])
        return locked

    confirm_order_payment(locked, user=payment.user)

    total = locked.total_clp
    net = int((Decimal(total) / Decimal('1.19')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    tax = total - net
    SalesReceipt.objects.get_or_create(
        order=locked,
        payment_transaction=payment,
        defaults={
            'document_number': f'INT-{locked.id}-{payment.id}',
            'net_amount_clp': net,
            'tax_amount_clp': tax,
            'total_amount_clp': total,
            'raw_data': {'tax_rate': 0.19},
        }
    )
    payment.accounting_status = PaymentTransaction.AccountingStatus.REGISTERED
    payment.save(update_fields=['accounting_status', 'updated_at'])
    Cart.objects.filter(user=locked.user).delete()
    return locked
