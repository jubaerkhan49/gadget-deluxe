#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files into staticfiles directory
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate --fake-initial

# Ensure default admin user exists and password is set to 787898
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u, created = User.objects.get_or_create(
    username='jubaer',
    defaults={'email': 'jubaer@gadgetdeluxe.com', 'role': 'ADMIN', 'is_staff': True, 'is_superuser': True}
)
u.set_password('787898')
u.is_staff = True
u.is_superuser = True
u.role = 'ADMIN'
u.save()
print('User jubaer configured with requested credentials')
" || true
