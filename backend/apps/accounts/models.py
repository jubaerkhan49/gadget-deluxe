from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """Custom User model supporting system roles: Admin, Manager, Employee, Technician, Read Only."""
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        EMPLOYEE = 'EMPLOYEE', 'Employee'
        TECHNICIAN = 'TECHNICIAN', 'Technician'
        READ_ONLY = 'READ_ONLY', 'Read Only'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
        help_text="Role-based authorization level"
    )
    phone = models.CharField(max_length=30, blank=True, null=True)
    employee_code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['username']

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin_or_manager(self) -> bool:
        return self.role in [self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser

    @property
    def can_edit_inventory(self) -> bool:
        return self.role in [self.Role.ADMIN, self.Role.MANAGER, self.Role.EMPLOYEE, self.Role.TECHNICIAN] or self.is_superuser

    @property
    def can_process_sales(self) -> bool:
        return self.role in [self.Role.ADMIN, self.Role.MANAGER, self.Role.EMPLOYEE] or self.is_superuser
