from rest_framework import serializers


class WebpayCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class WebpayCommitSerializer(serializers.Serializer):
    token = serializers.CharField()
