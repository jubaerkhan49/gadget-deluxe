from django.db import migrations, models
from decimal import Decimal

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_device_received_date_bd'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='is_b2b',
            field=models.BooleanField(db_index=True, default=False, help_text='True if this device is an order for an external business/shop (excluded from personal investment)'),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_shop_name',
            field=models.CharField(blank=True, db_index=True, help_text='Name of the client shop/company', max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_delivery_date',
            field=models.DateField(blank=True, help_text='Date delivered to client business holder', null=True),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_has_issues',
            field=models.BooleanField(default=False, help_text='True if client or diagnostic reported issues'),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_issue_notes',
            field=models.TextField(blank=True, help_text='Description of reported hardware/cosmetic issues', null=True),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_selling_price',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Agreed selling/invoice price to client shop in BDT', max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='device',
            name='b2b_status',
            field=models.CharField(blank=True, default='PENDING_DELIVERY', help_text='B2B lifecycle status: PENDING_DELIVERY, DELIVERED, UNDER_REPAIR, RETURNED', max_length=30, null=True),
        ),
    ]
