from django.db import models
from apps.core.models import TimeStampedModel
from apps.inventory.models import Device

class SickwReport(TimeStampedModel):
    """Sickw API / Raw text report output stored alongside structured attributes."""
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True, related_name='sickw_reports')
    raw_text = models.TextField(help_text="Original unedited Sickw output block")
    parsed_data = models.JSONField(default=dict, blank=True)

    # Key extracted attributes
    model_description = models.CharField(max_length=255, blank=True, null=True)
    model = models.CharField(max_length=150, blank=True, null=True)
    imei = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    imei2 = models.CharField(max_length=50, blank=True, null=True)
    meid = models.CharField(max_length=50, blank=True, null=True)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_purchase_date = models.CharField(max_length=100, blank=True, null=True)
    warranty_status = models.CharField(max_length=150, blank=True, null=True)
    icloud_lock = models.CharField(max_length=100, blank=True, null=True)
    demo_unit = models.CharField(max_length=50, blank=True, null=True)
    loaner_device = models.CharField(max_length=50, blank=True, null=True)
    replaced_device = models.CharField(max_length=50, blank=True, null=True)
    replacement_device = models.CharField(max_length=50, blank=True, null=True)
    refurbished_device = models.CharField(max_length=50, blank=True, null=True)
    purchase_country = models.CharField(max_length=100, blank=True, null=True)
    locked_carrier = models.CharField(max_length=150, blank=True, null=True)
    sim_lock_status = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Sickw Report - IMEI {self.imei or 'N/A'} ({self.created_at.strftime('%Y-%m-%d')})"
