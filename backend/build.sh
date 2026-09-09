#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files into staticfiles directory
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate --fake-initial

# Ensure default admin user exists in fresh database
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('jubaer', 'jubaer@gadgetdeluxe.com', 'admin123', role='ADMIN')
    print('Default superuser jubaer created')
" || true
