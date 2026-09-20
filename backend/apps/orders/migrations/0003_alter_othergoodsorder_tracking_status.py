from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_add_pricing_profit_payment_methods'),
    ]

    operations = [
        migrations.AlterField(
            model_name='othergoodsorder',
            name='tracking_status',
            field=models.CharField(
                choices=[
                    ('ORDER_CONFIRMED', 'Order Confirmed'),
                    ('PAYMENT_RECEIVED', 'Payment Made / Advance Paid'),
                    ('PRODUCT_PURCHASED', 'Product Purchased'),
                    ('SHIPPED_TO_CN_WAREHOUSE', 'Shipped to China Warehouse'),
                    ('RECEIVED_AT_CN_WAREHOUSE', 'Received at CN Warehouse'),
                    ('SHIPPED_TO_BD', 'Shipped to BD (In Transit)'),
                    ('ARRIVED_AT_BD', 'Arrived at BD'),
                    ('RECEIVED_IN_BD', 'Received in BD (Shipping Cost Confirmed)'),
                    ('DELIVERED', 'Product Delivered Successfully'),
                ],
                db_index=True,
                default='ORDER_CONFIRMED',
                max_length=50,
            ),
        ),
    ]
