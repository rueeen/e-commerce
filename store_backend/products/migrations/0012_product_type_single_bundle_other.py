from django.db import migrations, models


def normalize_product_types(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(product_type__in=['sealed', 'deck', 'accessory']).update(product_type='bundle')


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0011_purchaseorder_update_prices_on_receive'),
    ]

    operations = [
        migrations.RunPython(normalize_product_types, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='product',
            name='product_type',
            field=models.CharField(
                choices=[('single', 'Carta individual'), ('bundle', 'Bundle'), ('other', 'Otro')],
                db_index=True,
                default='single',
                max_length=20,
            ),
        ),
    ]
