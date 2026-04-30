from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0007_pricingsettings_product_price_clp_final_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="pricingsettings",
            old_name="round_to",
            new_name="rounding_to",
        ),
        migrations.AlterField(
            model_name="pricingsettings",
            name="name",
            field=models.CharField(default="Configuración principal", max_length=120),
        ),
        migrations.AddField(
            model_name="pricingsettings",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
            preserve_default=False,
        ),
    ]
