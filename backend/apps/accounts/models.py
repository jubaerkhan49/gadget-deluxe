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


class EmployeeApplication(models.Model):
    """Stores prospective employee join applications submitted from the landing portal."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    full_name = models.CharField(max_length=150, help_text="Full Name of applicant")
    nickname = models.CharField(max_length=100, blank=True, null=True, help_text="Preferred nickname / short name")
    phone = models.CharField(max_length=30, help_text="Contact phone number")
    email = models.EmailField(help_text="Contact & Login email address")
    nid_number = models.CharField(max_length=50, help_text="National ID / Passport number")
    address = models.TextField(help_text="Residential / Permanent address")
    photo = models.TextField(blank=True, null=True, help_text="Base64 encoded image string (must be under 100KB)")
    password = models.CharField(max_length=128, help_text="Desired password for employee login upon approval")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_employee_applications'
    )
    review_notes = models.TextField(blank=True, null=True)
    created_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='joined_application'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email}) - {self.get_status_display()}"


class EmployeeProfileUpdateRequest(models.Model):
    """Stores profile information update requests submitted by employees awaiting admin approval."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='profile_update_requests'
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_profile_update_requests'
    )
    review_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Update Request for @{self.user.username} ({self.get_status_display()})"
