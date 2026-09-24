#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Build React Frontend SPA if npm is available
if command -v npm &> /dev/null && [ -d "../frontend" ]; then
    echo "Building React Frontend SPA..."
    cd ../frontend
    npm install
    npm run build
    cd ../backend
fi

# Install Python backend dependencies
pip install -r requirements.txt

# Collect static files into staticfiles directory (including React SPA assets)
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate --noinput

# Ensure default admin user exists from environment variables if provided
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
admin_user = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@gadgetdeluxe.local')
admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

u, created = User.objects.get_or_create(
    username=admin_user,
    defaults={'email': admin_email, 'role': 'ADMIN', 'is_staff': True, 'is_superuser': True}
)
if admin_password:
    u.set_password(admin_password)
u.is_staff = True
u.is_superuser = True
u.role = 'ADMIN'
u.save()
print('Admin user configured successfully')

employees = {
    'ochi': ('Ochi#GD789!', 'Ochi'),
    'ashraf': ('Ashraf#GD456!', 'Ashraf'),
    'emon': ('Emon#GD123!', 'Emon')
}

for username, (password, first_name) in employees.items():
    emp, created = User.objects.get_or_create(
        username=username,
        defaults={'role': 'EMPLOYEE', 'first_name': first_name, 'is_active': True}
    )
    emp.set_password(password)
    emp.role = 'EMPLOYEE'
    emp.first_name = first_name
    emp.is_active = True
    emp.save()
    print(f'Employee {username} configured with password')
" || true

