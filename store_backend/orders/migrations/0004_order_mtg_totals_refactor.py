from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_mtg_flow_updates"),
    ]

    operations = [
        migrations.RemoveField(model_name="order", name="stock_deducted"),
        migrations.RemoveField(model_name="order", name="total_amount"),
        migrations.RemoveField(model_name="orderitem", name="unit_price"),
        migrations.RemoveField(model_name="orderitem", name="subtotal"),
        migrations.AddField(model_name="order", name="subtotal_clp", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="order", name="shipping_clp", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="order", name="discount_clp", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="order", name="total_clp", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="order", name="paid_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="order", name="cancelled_at", field=models.DateTimeField(blank=True, null=True)),
    ]
