from django.db import models
from django.conf import settings

class TimeStampedModel(models.Model):
    """Abstract base model that provides self-updating created_at and updated_at fields."""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class ActivityLog(TimeStampedModel):
    """System-wide audit activity log tracking critical events."""
    ACTION_TYPES = [
        ('CREATE', 'Creation'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Deletion'),
        ('ASSIGN', 'Assignment'),
        ('SALE', 'Sale Processed'),
        ('REPAIR', 'Repair Event'),
        ('SICKW', 'Sickw Parsed'),
        ('LOGIN', 'User Login'),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    module = models.CharField(max_length=50, db_index=True)
    target_repr = models.CharField(max_length=255)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        actor_name = self.actor.username if self.actor else 'System'
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {actor_name} - {self.action}: {self.target_repr}"
