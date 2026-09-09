from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.shipments.models import Shipment

class DeviceStatus(models.TextChoices):
    WAITING_SHIPMENT = 'WAITING_SHIPMENT', 'Waiting Shipment'
    IN_STOCK = 'IN_STOCK', 'In Stock'
    ASSIGNED = 'ASSIGNED', 'Assigned'
    UNDER_REPAIR = 'UNDER_REPAIR', 'Under Repair'
    SOLD = 'SOLD', 'Sold'
    RETURNED = 'RETURNED', 'Returned'
    LOST = 'LOST', 'Lost'

class DeviceVariant(models.TextChoices):
    MODIFIED = 'Modified', 'Modified'
    USA_ESIM = 'USA eSim', 'USA eSim'
    CANADA = 'Canada', 'Canada'
    MEXICAN = 'Mexican', 'Mexican'
    KOREA = 'Korea', 'Korea'
    SINGAPORE = 'Singapore', 'Singapore'
    BYPASS = 'Bypass', 'Bypass'

class Device(TimeStampedModel):
    """Central Device entity representing a unique mobile phone in inventory."""
    imei = models.CharField(max_length=50, unique=True, db_index=True)
    imei2 = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    meid = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    model = models.CharField(max_length=150, db_index=True, help_text="e.g. iPhone 15 Pro Max")
    model_description = models.CharField(max_length=255, blank=True, null=True)
    capacity = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    purchase_country = models.CharField(max_length=100, blank=True, null=True)
    carrier_policy = models.CharField(max_length=150, blank=True, null=True)
    sim_lock_status = models.CharField(max_length=100, blank=True, null=True)
    icloud_status = models.CharField(max_length=100, blank=True, null=True)
    warranty_status = models.CharField(max_length=150, blank=True, null=True)
    estimated_purchase_date = models.DateField(blank=True, null=True)

    demo_unit = models.BooleanField(default=False)
    loaner_device = models.BooleanField(default=False)
    replacement_device = models.BooleanField(default=False)
    replaced_device = models.BooleanField(default=False)
    refurbished = models.BooleanField(default=False)

    battery_health = models.PositiveIntegerField(blank=True, null=True, help_text="Percentage e.g. 95")
    battery_cycle = models.PositiveIntegerField(blank=True, null=True)
    display_type = models.CharField(max_length=100, blank=True, null=True)
    face_id = models.CharField(max_length=50, blank=True, null=True, default='Working')
    true_tone = models.CharField(max_length=50, blank=True, null=True, default='Working')
    original_parts_status = models.CharField(max_length=150, blank=True, null=True)

    variant = models.CharField(max_length=50, choices=DeviceVariant.choices, blank=True, null=True, help_text="Device variant")
    storage = models.CharField(max_length=50, blank=True, null=True)
    ram = models.CharField(max_length=50, blank=True, null=True)
    buying_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="Total buying cost price (Item price + Shipment fees) in BDT")
    notes = models.TextField(blank=True, null=True)

    current_status = models.CharField(
        max_length=30,
        choices=DeviceStatus.choices,
        default=DeviceStatus.WAITING_SHIPMENT,
        db_index=True
    )
    current_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_devices'
    )
    current_shipment = models.ForeignKey(
        Shipment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='devices'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.model} - IMEI: {self.imei} ({self.get_current_status_display()})"

class CarrierInformation(TimeStampedModel):
    """Detailed carrier lock & policy information for a device."""
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name='carrier_info')
    carrier_name = models.CharField(max_length=100, blank=True, null=True)
    lock_status = models.CharField(max_length=100, blank=True, null=True)
    policy_details = models.TextField(blank=True, null=True)

    def __str__(self) -> str:
        return f"Carrier Info for {self.device.imei}: {self.carrier_name}"

class Warranty(TimeStampedModel):
    """Warranty records for devices."""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='warranties')
    provider = models.CharField(max_length=100, default='Apple Care')
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    details = models.TextField(blank=True, null=True)
    claim_status = models.CharField(max_length=50, default='Active')

    class Meta:
        ordering = ['-end_date']

    def __str__(self) -> str:
        return f"Warranty ({self.provider}) - Device {self.device.imei}"

class DeviceAssignment(TimeStampedModel):
    """Historical assignment log of device to employee."""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_assignments')
    assigned_date = models.DateTimeField(auto_now_add=True)
    returned_date = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-assigned_date']

    def __str__(self) -> str:
        return f"Device {self.device.imei} -> {self.employee.username}"

class DeviceHistory(TimeStampedModel):
    """Audit log tracking state transitions and updates to devices."""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=50)
    old_state = models.TextField(blank=True, null=True)
    new_state = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.device.imei} history ({self.action_type})"

class Photo(TimeStampedModel):
    """Photos linked to devices (Front, Back, Display, IMEI Sticker, Repair Photos, Invoice, etc)."""
    PHOTO_TYPES = [
        ('FRONT', 'Front'),
        ('BACK', 'Back'),
        ('DISPLAY', 'Display'),
        ('BATTERY', 'Battery'),
        ('IMEI_STICKER', 'IMEI Sticker'),
        ('REPAIR', 'Repair Photo'),
        ('INVOICE', 'Invoice'),
        ('PACKAGING', 'Packaging'),
        ('OTHER', 'Other'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='photos')
    photo_type = models.CharField(max_length=30, choices=PHOTO_TYPES, default='FRONT')
    image = models.ImageField(upload_to='device_photos/%Y/%m/')
    caption = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Photo ({self.get_photo_type_display()}) for {self.device.imei}"

class Note(TimeStampedModel):
    """General notes attached to a device."""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='device_notes')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    content = models.TextField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Note by {self.author} on {self.device.imei}"
