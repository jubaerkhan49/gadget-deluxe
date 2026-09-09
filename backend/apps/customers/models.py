from django.db import models
from apps.core.models import TimeStampedModel

class Customer(TimeStampedModel):
    """Customer purchasing device inventory."""
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=50, db_index=True)
    address = models.TextField(blank=True, null=True)
    facebook = models.CharField(max_length=255, blank=True, null=True, help_text="Facebook profile or page URL/handle")
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"
