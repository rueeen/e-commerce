from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0012_product_type_single_bundle_other"),
    ]

    operations = [
        migrations.CreateModel(
            name="SealedProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sealed_kind", models.CharField(choices=[("precon", "Precon"), ("booster", "Booster"), ("bundle", "Bundle"), ("other", "Otro")], default="other", max_length=20)),
                ("set_code", models.CharField(blank=True, max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name="SingleCard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("condition", models.CharField(choices=[("NM", "Near Mint"), ("LP", "Lightly Played"), ("MP", "Moderately Played"), ("HP", "Heavily Played"), ("DMG", "Damaged")], default="NM", max_length=5)),
                ("language", models.CharField(default="EN", max_length=40)),
                ("is_foil", models.BooleanField(default=False)),
                ("edition", models.CharField(blank=True, max_length=120)),
                ("price_usd_reference", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("mtg_card", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="single_products", to="products.mtgcard")),
            ],
        ),
        migrations.CreateModel(
            name="BundleItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("bundle", models.ForeignKey(limit_choices_to={"product_type": "bundle"}, on_delete=django.db.models.deletion.CASCADE, related_name="bundle_items", to="products.product")),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="part_of_bundles", to="products.product")),
            ],
            options={"unique_together": {("bundle", "item")}},
        ),
        migrations.AlterField(
            model_name="product",
            name="product_type",
            field=models.CharField(choices=[("single", "Carta individual"), ("sealed", "Sellado"), ("bundle", "Bundle")], db_index=True, default="single", max_length=20),
        ),
        migrations.RemoveField(model_name="product", name="condition"),
        migrations.RemoveField(model_name="product", name="edition"),
        migrations.RemoveField(model_name="product", name="is_foil"),
        migrations.RemoveField(model_name="product", name="language"),
        migrations.RemoveField(model_name="product", name="mtg_card"),
        migrations.RemoveField(model_name="product", name="price"),
        migrations.RemoveField(model_name="product", name="price_clp_final"),
        migrations.RemoveField(model_name="product", name="price_usd_reference"),
        migrations.AddField(
            model_name="singlecard",
            name="product",
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="single_card", to="products.product"),
        ),
        migrations.AddField(
            model_name="sealedproduct",
            name="product",
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="sealed_product", to="products.product"),
        ),
    ]
