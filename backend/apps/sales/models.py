from django.db import models
from django.conf import settings
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.inventory.models import Device
from apps.customers.models import Customer

class Sale(TimeStampedModel):
    """Sale records for devices sold to customers with profit tracking."""
    PAYMENT_STATUS_CHOICES = [
        ('PAID', 'Paid'),
        ('PARTIAL', 'Partial'),
        ('PENDING', 'Pending'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK', 'Bank Transfer'),
        ('CARD', 'Credit/Debit Card'),
        ('MOBILE', 'Mobile Banking'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='sales')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='processed_sales')

    buying_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Cost price of device")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Agreed sale price")
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="Employee commission amount in BDT")
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="Selling price - Discount - Buying price")

    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PAID')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    invoice_number = models.CharField(max_length=100, unique=True, db_index=True)
    sale_date = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-sale_date']

    @property
    def total_repair_cost(self) -> Decimal:
        if not self.device_id:
            return Decimal('0.00')
        repair_sum = self.device.repairs.aggregate(models.Sum('repair_cost'))['repair_cost__sum']
        return repair_sum or Decimal('0.00')

    def save(self, *args, **kwargs):
        # Auto-compute net profit = selling_price - discount - buying_price - commission_amount - total_repair_cost
        repair_cost = Decimal('0.00')
        if self.device_id:
            repair_sum = self.device.repairs.aggregate(models.Sum('repair_cost'))['repair_cost__sum']
            if repair_sum:
                repair_cost = Decimal(str(repair_sum))

        self.profit = Decimal(str(self.selling_price)) - Decimal(str(self.discount)) - Decimal(str(self.buying_price)) - Decimal(str(self.commission_amount)) - repair_cost
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Invoice {self.invoice_number} - Device: {self.device.imei} (BDT {self.selling_price})"
