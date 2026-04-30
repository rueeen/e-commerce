from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_update_pricing_settings_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='KardexMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('movement_type', models.CharField(choices=[('IN', 'Entrada manual'), ('OUT', 'Salida manual'), ('ADJUSTMENT', 'Ajuste'), ('SALE', 'Venta'), ('RETURN', 'Devolución'), ('CORRECTION', 'Corrección')], max_length=20)),
                ('quantity', models.PositiveIntegerField()),
                ('previous_stock', models.PositiveIntegerField()),
                ('new_stock', models.PositiveIntegerField()),
                ('unit_cost_clp', models.PositiveIntegerField(default=0)),
                ('unit_price_clp', models.PositiveIntegerField(default=0)),
                ('reference', models.CharField(blank=True, max_length=255)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='kardex_movements', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='kardex_movements', to='products.product')),
            ],
            options={'ordering': ['-created_at', '-id']},
        ),
    ]
