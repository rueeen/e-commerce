from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("digital_library", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(name="PurchaseDigitalAccess"),
    ]
