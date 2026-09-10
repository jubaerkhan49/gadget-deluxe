import os
from django.core.management.base import BaseCommand
from apps.accounts.models import User

class Command(BaseCommand):
    help = 'Seeds initial admin user and required employee accounts.'

    def handle(self, *args, **options):
        admin_username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin123!')

        employees = [
            {'username': admin_username, 'first_name': 'Administrator', 'last_name': '', 'role': User.Role.ADMIN, 'email': 'admin@gadgetdeluxe.local', 'is_superuser': True, 'is_staff': True},
            {'username': 'ashraf', 'first_name': 'Ashraf', 'last_name': 'Employee', 'role': User.Role.EMPLOYEE, 'employee_code': 'EMP001'},
            {'username': 'emon', 'first_name': 'Emon', 'last_name': 'Employee', 'role': User.Role.EMPLOYEE, 'employee_code': 'EMP002'},
            {'username': 'ochi', 'first_name': 'Ochi', 'last_name': 'Employee', 'role': User.Role.EMPLOYEE, 'employee_code': 'EMP003'},
        ]

        for emp_data in employees:
            username = emp_data['username']
            user, created = User.objects.get_or_create(
                username=username,
                defaults=emp_data
            )
            if username == admin_username:
                user.set_password(admin_password)
                user.first_name = 'Administrator'
                user.last_name = ''
            else:
                user.set_password('Employee123!')
            user.save()
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created user: {username} ({user.get_role_display()})"))
            else:
                self.stdout.write(self.style.NOTICE(f"User {username} already exists."))
