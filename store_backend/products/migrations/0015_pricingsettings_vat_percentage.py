from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0014_inventorylot"),
    ]

    operations = [
        migrations.AddField(
            model_name="pricingsettings",
            name="vat_percentage",
            field=models.DecimalField(decimal_places=2, default=19, max_digits=5),
        ),
    ]
