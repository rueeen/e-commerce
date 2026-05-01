from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("products", "0009_kardexmovement"),
    ]

    operations = [
        migrations.AddField(
            model_name="pricingsettings",
            name="default_margin",
            field=models.DecimalField(decimal_places=2, default=1.3, max_digits=6),
        ),
        migrations.AddField(
            model_name="pricingsettings",
            name="min_margin",
            field=models.DecimalField(decimal_places=2, default=1.15, max_digits=6),
        ),
        migrations.AddField(
            model_name="pricingsettings",
            name="usd_to_clp_real",
            field=models.DecimalField(decimal_places=2, default=1000, max_digits=12),
        ),
        migrations.AddField(
            model_name="pricingsettings",
            name="usd_to_clp_store",
            field=models.DecimalField(decimal_places=2, default=1150, max_digits=12),
        ),
        migrations.CreateModel(
            name="PurchaseOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order_number", models.CharField(max_length=50, unique=True)),
                ("external_reference", models.CharField(blank=True, max_length=120)),
                ("status", models.CharField(choices=[("DRAFT", "Borrador"), ("SENT", "Enviada"), ("RECEIVED", "Recibida"), ("CANCELLED", "Cancelada")], default="DRAFT", max_length=20)),
                ("subtotal_clp", models.PositiveIntegerField(default=0)),
                ("shipping_clp", models.PositiveIntegerField(default=0)),
                ("import_fees_clp", models.PositiveIntegerField(default=0)),
                ("taxes_clp", models.PositiveIntegerField(default=0)),
                ("total_clp", models.PositiveIntegerField(default=0)),
                ("subtotal_usd", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("shipping_usd", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("payment_fee_usd", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("exchange_rate", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("total_paid_clp", models.PositiveIntegerField(default=0)),
                ("customs_clp", models.PositiveIntegerField(default=0)),
                ("handling_clp", models.PositiveIntegerField(default=0)),
                ("other_costs_clp", models.PositiveIntegerField(default=0)),
                ("total_real_clp", models.PositiveIntegerField(default=0)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="purchase_orders_created", to=settings.AUTH_USER_MODEL)),
                ("supplier", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="purchase_orders", to="products.supplier")),
            ],
        ),
        migrations.CreateModel(
            name="PurchaseOrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity_ordered", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("quantity_received", models.PositiveIntegerField(default=0)),
                ("unit_cost_usd", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("unit_cost_clp", models.PositiveIntegerField(default=0)),
                ("subtotal_clp", models.PositiveIntegerField(default=0)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="purchase_order_items", to="products.product")),
                ("purchase_order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="products.purchaseorder")),
            ],
        ),
    ]
