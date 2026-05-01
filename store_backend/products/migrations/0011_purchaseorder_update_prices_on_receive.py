from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0010_international_purchase_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchaseorder",
            name="update_prices_on_receive",
            field=models.BooleanField(default=False),
        ),
    ]
