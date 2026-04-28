from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    role = Profile.Role.ADMIN if (instance.is_staff or instance.is_superuser) else Profile.Role.CUSTOMER
    if created:
        Profile.objects.get_or_create(user=instance, defaults={"role": role})
        return

    profile, _ = Profile.objects.get_or_create(user=instance)
    if (instance.is_staff or instance.is_superuser) and profile.role != Profile.Role.ADMIN:
        profile.role = Profile.Role.ADMIN
        profile.save(update_fields=["role", "updated_at"])
