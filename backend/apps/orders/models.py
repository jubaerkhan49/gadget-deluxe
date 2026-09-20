import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.core.models import TimeStampedModel


class TrackingStage(models.TextChoices):
    ORDER_CONFIRMED = 'ORDER_CONFIRMED', 'Order Confirmed'
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED', 'Payment Made / Advance Paid'
    PRODUCT_PURCHASED = 'PRODUCT_PURCHASED', 'Product Purchased'
    SHIPPED_TO_CN_WAREHOUSE = 'SHIPPED_TO_CN_WAREHOUSE', 'Shipped to China Warehouse'
    SHIPPED_TO_BD = 'SHIPPED_TO_BD', 'Shipped to BD (In Transit)'
    ARRIVED_AT_BD = 'ARRIVED_AT_BD', 'Arrived at BD'
    RECEIVED_IN_BD = 'RECEIVED_IN_BD', 'Received in BD (Shipping Cost Confirmed)'
    DELIVERED = 'DELIVERED', 'Product Delivered Successfully'


class ProductCategory(models.TextChoices):
    LAPTOP = 'Laptop', 'Laptop'
    AIRPODS = 'AirPods', 'AirPods / Audio'
    LAPTOP_PARTS = 'Laptop Parts', 'Laptop Parts'
    GADGETS = 'Gadgets', 'Gadget Items'
    COSMETICS = 'Cosmetics', 'Cosmetics'
    ACCESSORIES = 'Accessories', 'Accessories'
    WATCH = 'Smartwatch', 'Smartwatch / Wearables'
    OTHER = 'Other Goods', 'Other Goods'


class OtherGoodsOrder(TimeStampedModel):
    """
    Tracks custom individual customer orders for goods other than mobile phones
    (e.g., Laptops, AirPods, laptop parts, gadgets, cosmetics, accessories).
    Includes an 8-stage tracking pipeline and public tracking access.
    """
    order_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique customer-facing Order ID (e.g. OG-2026-0001)"
    )
    
    # Customer Details
    customer_name = models.CharField(max_length=150, db_index=True)
    customer_phone = models.CharField(max_length=50, db_index=True)
    customer_address = models.TextField(blank=True, null=True)

    # Product Details
    product_name = models.CharField(max_length=255, db_index=True)
    category = models.CharField(
        max_length=50,
        choices=ProductCategory.choices,
        default=ProductCategory.OTHER
    )
    product_specs = models.TextField(blank=True, null=True, help_text="Specs, color, model number, serial, etc.")
    source_url = models.URLField(blank=True, null=True, help_text="Link to supplier / Taobao / JD / Amazon store")

    # Financials (BDT)
    product_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Base item price in BDT"
    )
    shipping_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Freight & shipping cost in BDT"
    )
    payment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total payment received from customer so far (advance or full)"
    )

    # Key Dates
    order_date = models.DateField(default=timezone.localdate)
    payment_date = models.DateField(blank=True, null=True)
    estimated_delivery_date = models.DateField(blank=True, null=True)
    actual_delivery_date = models.DateField(blank=True, null=True)

    # Tracking & Pipeline
    tracking_status = models.CharField(
        max_length=50,
        choices=TrackingStage.choices,
        default=TrackingStage.ORDER_CONFIRMED,
        db_index=True
    )
    carrier_tracking_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="China / International carrier tracking code"
    )
    tracking_notes = models.TextField(blank=True, null=True, help_text="Latest stage remark / status update")
    timeline_events = models.JSONField(
        default=list,
        blank=True,
        help_text="Structured historical timeline: [{'stage': str, 'timestamp': str, 'note': str}]"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Other Goods Order'
        verbose_name_plural = 'Other Goods Orders'

    def __str__(self) -> str:
        return f"{self.order_id} - {self.customer_name} ({self.product_name})"

    @property
    def total_amount(self) -> Decimal:
        return (self.product_price or Decimal('0.00')) + (self.shipping_cost or Decimal('0.00'))

    @property
    def due_amount(self) -> Decimal:
        diff = self.total_amount - (self.payment_amount or Decimal('0.00'))
        return max(diff, Decimal('0.00'))

    @property
    def payment_status(self) -> str:
        paid = self.payment_amount or Decimal('0.00')
        total = self.total_amount
        if paid <= Decimal('0.00'):
            return 'UNPAID'
        if paid >= total and total > Decimal('0.00'):
            return 'PAID'
        return 'PARTIAL'

    def save(self, *args, **kwargs):
        # Auto-generate unique order_id if not present
        if not self.order_id:
            count = OtherGoodsOrder.objects.count() + 1
            now_prefix = timezone.now().strftime('%y%m')
            self.order_id = f"OG-{now_prefix}-{count:04d}"

        # If timeline_events is empty, initialize with first event
        if not self.timeline_events:
            self.timeline_events = [{
                'stage': self.tracking_status,
                'stage_display': self.get_tracking_status_display(),
                'timestamp': timezone.now().isoformat(),
                'note': self.tracking_notes or 'Order registered in system.'
            }]

        super().save(*args, **kwargs)
