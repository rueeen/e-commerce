from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_mtg_totals_refactor"),
    ]

    operations = [
        migrations.AddField(model_name="orderitem", name="gross_profit_clp", field=models.IntegerField(default=0)),
        migrations.AddField(model_name="orderitem", name="total_cost_clp", field=models.IntegerField(default=0)),
        migrations.AddField(model_name="orderitem", name="unit_cost_clp", field=models.IntegerField(default=0)),
    ]
