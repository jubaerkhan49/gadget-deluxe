import decimal
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='OtherGoodsOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order_id', models.CharField(db_index=True, help_text='Unique customer-facing Order ID (e.g. OG-2026-0001)', max_length=50, unique=True)),
                ('customer_name', models.CharField(db_index=True, max_length=150)),
                ('customer_phone', models.CharField(db_index=True, max_length=50)),
                ('customer_address', models.TextField(blank=True, null=True)),
                ('product_name', models.CharField(db_index=True, max_length=255)),
                ('category', models.CharField(choices=[('Laptop', 'Laptop'), ('AirPods', 'AirPods / Audio'), ('Laptop Parts', 'Laptop Parts'), ('Gadgets', 'Gadget Items'), ('Cosmetics', 'Cosmetics'), ('Accessories', 'Accessories'), ('Smartwatch', 'Smartwatch / Wearables'), ('Other Goods', 'Other Goods')], default='Other Goods', max_length=50)),
                ('product_specs', models.TextField(blank=True, help_text='Specs, color, model number, serial, etc.', null=True)),
                ('source_url', models.URLField(blank=True, help_text='Link to supplier / Taobao / JD / Amazon store', null=True)),
                ('product_price', models.DecimalField(decimal_places=2, default=decimal.Decimal('0.00'), help_text='Base item price in BDT', max_digits=12)),
                ('shipping_cost', models.DecimalField(decimal_places=2, default=decimal.Decimal('0.00'), help_text='Freight & shipping cost in BDT', max_digits=12)),
                ('payment_amount', models.DecimalField(decimal_places=2, default=decimal.Decimal('0.00'), help_text='Total payment received from customer so far (advance or full)', max_digits=12)),
                ('order_date', models.DateField(default=django.utils.timezone.localdate)),
                ('payment_date', models.DateField(blank=True, null=True)),
                ('estimated_delivery_date', models.DateField(blank=True, null=True)),
                ('actual_delivery_date', models.DateField(blank=True, null=True)),
                ('tracking_status', models.CharField(choices=[('ORDER_CONFIRMED', 'Order Confirmed'), ('PAYMENT_RECEIVED', 'Payment Made / Advance Paid'), ('PRODUCT_PURCHASED', 'Product Purchased'), ('SHIPPED_TO_CN_WAREHOUSE', 'Shipped to China Warehouse'), ('SHIPPED_TO_BD', 'Shipped to BD (In Transit)'), ('ARRIVED_AT_BD', 'Arrived at BD'), ('RECEIVED_IN_BD', 'Received in BD (Shipping Cost Confirmed)'), ('DELIVERED', 'Product Delivered Successfully')], db_index=True, default='ORDER_CONFIRMED', max_length=50)),
                ('carrier_tracking_number', models.CharField(blank=True, help_text='China / International carrier tracking code', max_length=100, null=True)),
                ('tracking_notes', models.TextField(blank=True, help_text='Latest stage remark / status update', null=True)),
                ('timeline_events', models.JSONField(blank=True, default=list, help_text="Structured historical timeline: [{'stage': str, 'timestamp': str, 'note': str}]")),
            ],
            options={
                'verbose_name': 'Other Goods Order',
                'verbose_name_plural': 'Other Goods Orders',
                'ordering': ['-created_at'],
            },
        ),
    ]
