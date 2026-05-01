from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
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
        migrations.AddField(
            model_name="purchaseorder",
            name="customs_clp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="exchange_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="handling_clp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="other_costs_clp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="payment_fee_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="shipping_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="subtotal_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="total_paid_clp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="total_real_clp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="purchaseorderitem",
            name="unit_cost_usd",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
    ]
