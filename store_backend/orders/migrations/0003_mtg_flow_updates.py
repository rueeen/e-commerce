from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_alter_order_options_assistedpurchaseorder_and_more"),
        ("products", "0013_mtg_product_refactor"),
    ]

    operations = [
        migrations.AddField(model_name="order",name="stock_deducted",field=models.BooleanField(default=False)),
        migrations.AddField(model_name="orderitem",name="product_name_snapshot",field=models.CharField(default="",max_length=255)),
        migrations.AddField(model_name="orderitem",name="product_type_snapshot",field=models.CharField(default="",max_length=20)),
        migrations.AddField(model_name="orderitem",name="unit_price_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="orderitem",name="subtotal_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AlterField(model_name="assistedpurchaseitem",name="product",field=models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="assisted_order_items",to="products.product")),
        migrations.AddField(model_name="assistedpurchaseitem",name="external_name",field=models.CharField(blank=True,default="",max_length=255),preserve_default=False),
        migrations.AddField(model_name="assistedpurchaseitem",name="external_url",field=models.URLField(blank=True,default=""),preserve_default=False),
        migrations.AddField(model_name="assistedpurchaseitem",name="external_sku",field=models.CharField(blank=True,default="",max_length=120),preserve_default=False),
        migrations.AddField(model_name="assistedpurchaseitem",name="requested_condition",field=models.CharField(blank=True,default="",max_length=20),preserve_default=False),
        migrations.AddField(model_name="assistedpurchaseitem",name="requested_language",field=models.CharField(blank=True,default="",max_length=20),preserve_default=False),
        migrations.AddField(model_name="assistedpurchaseitem",name="is_foil",field=models.BooleanField(default=False)),
        migrations.AddField(model_name="assistedpurchaseorder",name="shipping_usd",field=models.DecimalField(decimal_places=2,default=0,max_digits=12)),
        migrations.AddField(model_name="assistedpurchaseorder",name="payment_fee_usd",field=models.DecimalField(decimal_places=2,default=0,max_digits=12)),
        migrations.AddField(model_name="assistedpurchaseorder",name="exchange_rate_real",field=models.DecimalField(decimal_places=2,default=1000,max_digits=12)),
        migrations.AddField(model_name="assistedpurchaseorder",name="exchange_rate_store",field=models.DecimalField(decimal_places=2,default=1150,max_digits=12)),
        migrations.AddField(model_name="assistedpurchaseorder",name="customs_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="handling_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="other_costs_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="service_fee_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="total_customer_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="total_real_cost_clp",field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="assistedpurchaseorder",name="profit_clp",field=models.IntegerField(default=0)),
        migrations.RemoveField(model_name="assistedpurchaseorder",name="exchange_rate"),
        migrations.RemoveField(model_name="assistedpurchaseorder",name="service_fee"),
        migrations.RemoveField(model_name="assistedpurchaseorder",name="shipping_estimate"),
        migrations.RemoveField(model_name="assistedpurchaseorder",name="tax_estimate"),
        migrations.RemoveField(model_name="assistedpurchaseorder",name="total_clp"),
        migrations.AlterField(model_name="order",name="status",field=models.CharField(choices=[("pending","Pendiente"),("paid","Pagado"),("processing","Procesando"),("shipped","Enviado"),("delivered","Entregado"),("canceled","Cancelado")],default="pending",max_length=20)),
    ]
