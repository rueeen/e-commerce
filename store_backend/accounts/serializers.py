from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Profile
from .permissions import get_user_role


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "first_name", "last_name")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        Profile.objects.get_or_create(user=user, defaults={"role": Profile.Role.CUSTOMER})
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_staff", "role")

    def get_role(self, obj):
        return get_user_role(obj)


class AdminUserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "is_active")

    def get_role(self, obj):
        return get_user_role(obj)


class AdminUserDetailSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Profile.Role.choices, required=False)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_active", "role")
        read_only_fields = ("id",)

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if role:
            profile, _ = Profile.objects.get_or_create(user=instance)
            profile.role = role
            profile.save(update_fields=["role", "updated_at"])

        return instance


class UserRoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Profile.Role.choices)

    def update(self, instance, validated_data):
        profile, _ = Profile.objects.get_or_create(user=instance)
        profile.role = validated_data["role"]
        profile.save(update_fields=["role", "updated_at"])
        return instance


class UserStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()

    def validate_is_active(self, value):
        request = self.context.get("request")
        instance = self.context.get("user_instance")
        if request and request.user == instance and value is False:
            raise serializers.ValidationError("No puedes desactivar tu propia cuenta.")
        return value

    def update(self, instance, validated_data):
        instance.is_active = validated_data["is_active"]
        instance.save(update_fields=["is_active"])
        return instance
