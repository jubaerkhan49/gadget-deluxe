from django.db import models
from decimal import Decimal
from apps.core.models import TimeStampedModel
from apps.inventory.models import Device

class RepairStatus(models.TextChoices):
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    SENT_TO_CHINA = 'SENT_TO_CHINA', 'Sent To China'
    COMPLETED = 'COMPLETED', 'Completed'
    UNREPAIRABLE = 'UNREPAIRABLE', 'Unrepairable'

class Repair(TimeStampedModel):
    """Repair log tracking device issues, sent/returned dates, service centers & timeline."""
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='repairs')
    issue_description = models.TextField(help_text="Reported fault/hardware issue")
    sent_date = models.DateField(db_index=True)
    returned_date = models.DateField(blank=True, null=True)
    repair_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    repair_center = models.CharField(max_length=150, help_text="Facility or technician handling repair")
    country = models.CharField(max_length=100, blank=True, null=True, default='China')
    status = models.CharField(max_length=30, choices=RepairStatus.choices, default=RepairStatus.IN_PROGRESS, db_index=True)
    repair_notes = models.TextField(blank=True, null=True)
    timeline_log = models.JSONField(default=list, blank=True, help_text="Chronological event log list [{timestamp, text, author}]")

    class Meta:
        ordering = ['-sent_date', '-created_at']

    def __str__(self) -> str:
        return f"Repair #{self.id} - Device: {self.device.imei} ({self.get_status_display()})"
