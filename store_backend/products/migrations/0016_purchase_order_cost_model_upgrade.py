from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0015_pricingsettings_vat_percentage'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(model_name='purchaseorder', name='currency', field=models.CharField(choices=[('CLP', 'CLP'), ('USD', 'USD')], default='CLP', max_length=3)),
        migrations.AddField(model_name='purchaseorder', name='paypal_variation_clp', field=models.IntegerField(default=0)),
        migrations.AddField(model_name='purchaseorder', name='received_by', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='purchase_orders_received', to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name='purchaseorder', name='tax_rate_percent', field=models.DecimalField(decimal_places=2, default=19, max_digits=5)),
        migrations.AddField(model_name='purchaseorderitem', name='allocated_extra_cost_clp', field=models.IntegerField(default=0)),
        migrations.AddField(model_name='purchaseorderitem', name='margin_percent', field=models.DecimalField(decimal_places=2, default=35, max_digits=6)),
        migrations.AddField(model_name='purchaseorderitem', name='real_unit_cost_clp', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='purchaseorderitem', name='sale_price_to_apply_clp', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='purchaseorderitem', name='suggested_sale_price_clp', field=models.PositiveIntegerField(default=0)),
    ]
