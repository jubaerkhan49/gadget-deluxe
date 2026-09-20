import decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='othergoodsorder',
            name='buying_price',
            field=models.DecimalField(decimal_places=2, default=decimal.Decimal('0.00'), help_text='Product purchase / buying cost in BDT', max_digits=12),
        ),
        migrations.AddField(
            model_name='othergoodsorder',
            name='selling_price',
            field=models.DecimalField(decimal_places=2, default=decimal.Decimal('0.00'), help_text='Customer sold price / total selling amount in BDT', max_digits=12),
        ),
        migrations.AddField(
            model_name='othergoodsorder',
            name='payment_method',
            field=models.CharField(choices=[('CASH', 'Cash'), ('BKASH', 'bKash'), ('NAGAD', 'Nagad'), ('BANK', 'Bank Transfer')], default='BKASH', help_text='Payment method: Cash, bKash, Nagad, Bank', max_length=20),
        ),
        migrations.AddField(
            model_name='othergoodsorder',
            name='transaction_id',
            field=models.CharField(blank=True, help_text='TrxID / Transaction ID for bKash, Nagad, or Bank', max_length=100, null=True),
        ),
    ]
