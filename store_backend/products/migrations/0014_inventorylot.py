from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0013_mtg_product_refactor"),
    ]

    operations = [
        migrations.CreateModel(
            name="InventoryLot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity_initial", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("quantity_remaining", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(0)])),
                ("unit_cost_clp", models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("received_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="lots", to="products.product")),
                (
                    "purchase_order_item",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="lots", to="products.purchaseorderitem"),
                ),
            ],
            options={"ordering": ["received_at", "id"]},
        ),
    ]
