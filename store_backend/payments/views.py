from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_datetime
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order

from .models import PaymentTransaction
from .serializers import WebpayCommitSerializer, WebpayCreateSerializer
from .services import commit_webpay_transaction, create_webpay_transaction, finalize_paid_order


class WebpayCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = WebpayCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        order = Order.objects.get(pk=s.validated_data['order_id'])

        try:
            payment, response = create_webpay_transaction(order, request.user)
        except ValidationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'token': payment.token, 'url': response.get('url'), 'order_id': order.id})


class WebpayCommitView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = WebpayCommitSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data['token']
        try:
            payment = PaymentTransaction.objects.get(token=token)
        except PaymentTransaction.DoesNotExist:
            return Response({'detail': 'No existe una transacción local asociada al token entregado.'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == PaymentTransaction.Status.AUTHORIZED:
            return Response({
                'status': payment.status,
                'response_code': payment.response_code,
                'buy_order': payment.buy_order,
                'session_id': payment.session_id,
                'amount': payment.amount_clp,
                'authorization_code': payment.authorization_code,
                'payment_type_code': payment.payment_type_code,
                'card_detail': {'card_number': payment.card_last_digits},
                'transaction_date': payment.transaction_date,
                'order_id': payment.order_id,
                'already_committed': True,
            })

        try:
            response = commit_webpay_transaction(token)
        except ValidationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payment.raw_response = response
        payment.authorization_code = response.get('authorization_code', '')
        payment.payment_type_code = response.get('payment_type_code', '')
        payment.response_code = response.get('response_code')
        payment.installments_number = response.get('installments_number') or 0
        payment.card_last_digits = (response.get('card_detail') or {}).get('card_number', '')
        payment.transaction_date = parse_datetime(response.get('transaction_date')) if response.get('transaction_date') else None

        is_authorized = response.get('response_code') == 0 and response.get('status') == 'AUTHORIZED'
        if is_authorized:
            payment.status = PaymentTransaction.Status.AUTHORIZED
            payment.save()
            order = finalize_paid_order(payment.order, payment)
            return Response({
                'status': response.get('status', 'AUTHORIZED'),
                'response_code': payment.response_code,
                'buy_order': response.get('buy_order', payment.buy_order),
                'session_id': response.get('session_id', payment.session_id),
                'amount': response.get('amount', payment.amount_clp),
                'authorization_code': payment.authorization_code,
                'payment_type_code': payment.payment_type_code,
                'card_detail': response.get('card_detail', {'card_number': payment.card_last_digits}),
                'transaction_date': response.get('transaction_date'),
                'order_id': order.id,
            })

        payment.status = PaymentTransaction.Status.FAILED
        payment.save()
        order = payment.order
        if order.status != Order.Status.PAID:
            order.status = Order.Status.PAYMENT_FAILED
            order.save(update_fields=['status', 'updated_at'])
        return Response({
            'status': response.get('status', 'FAILED'),
            'response_code': payment.response_code,
            'buy_order': response.get('buy_order', payment.buy_order),
            'session_id': response.get('session_id', payment.session_id),
            'amount': response.get('amount', payment.amount_clp),
            'authorization_code': payment.authorization_code,
            'payment_type_code': payment.payment_type_code,
            'card_detail': response.get('card_detail', {'card_number': payment.card_last_digits}),
            'transaction_date': response.get('transaction_date'),
            'order_id': order.id,
        }, status=status.HTTP_400_BAD_REQUEST)
