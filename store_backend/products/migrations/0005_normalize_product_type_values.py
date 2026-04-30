from django.db import migrations


def normalize_product_types(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Product.objects.filter(product_type='physical').update(product_type='single')
    Product.objects.filter(product_type='digital').update(product_type='accessory')


class Migration(migrations.Migration):
    dependencies = [('products', '0004_category_description_category_updated_at')]
    operations = [migrations.RunPython(normalize_product_types, migrations.RunPython.noop)]
