from rest_framework import serializers


class WebpayCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class WebpayCommitSerializer(serializers.Serializer):
    token = serializers.CharField(required=False)
    token_ws = serializers.CharField(required=False)

    def validate(self, attrs):
        token = attrs.get('token') or attrs.get('token_ws')
        if not token:
            raise serializers.ValidationError('Debes enviar "token" o "token_ws".')
        attrs['token'] = token
        return attrs
