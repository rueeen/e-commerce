from rest_framework import serializers


class WebpayCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class WebpayCommitSerializer(serializers.Serializer):
    token = serializers.CharField(required=False)
    token_ws = serializers.CharField(required=False)

    def validate(self, attrs):
        token = attrs.get('token')
        token_ws = attrs.get('token_ws')

        unified_token = token or token_ws
        if not unified_token:
            raise serializers.ValidationError('Debes enviar "token" o "token_ws".')

        attrs['token'] = unified_token
        return attrs
