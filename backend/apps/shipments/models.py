from django.db import models
from apps.core.models import TimeStampedModel

class Supplier(TimeStampedModel):
    """Supplier vendor details."""
    name = models.CharField(max_length=200, unique=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name

class Shipment(TimeStampedModel):
    """Shipment tracking incoming bulk devices from suppliers."""
    tracking_number = models.CharField(max_length=100, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='shipments')
    shipping_company = models.CharField(max_length=100, blank=True, null=True)
    receive_date = models.DateField(blank=True, null=True)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Gross total shipping cost in BDT")
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Cashback or discount from shipping agent in BDT")
    country = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-receive_date', '-created_at']

    def __str__(self) -> str:
        return f"Shipment #{self.tracking_number} ({self.supplier.name})"

    @property
    def total_devices_count(self) -> int:
        return self.devices.count()

    @property
    def net_shipping_cost(self):
        from decimal import Decimal
        gross = Decimal(str(self.shipping_cost or '0.00'))
        disc = Decimal(str(self.discount or '0.00'))
        return max(gross - disc, Decimal('0.00'))

    @property
    def unit_shipping_cost(self):
        from decimal import Decimal
        count = self.total_devices_count
        if count > 0:
            return (self.net_shipping_cost / Decimal(str(count))).quantize(Decimal('0.01'))
        return self.net_shipping_cost

