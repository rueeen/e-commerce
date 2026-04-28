from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PurchaseDigitalAccess',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('purchased_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='digital_accesses', to='products.product')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='digital_accesses', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-purchased_at'], 'unique_together': {('user', 'product')}},
        ),
    ]
