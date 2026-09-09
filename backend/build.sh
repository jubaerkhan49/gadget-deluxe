#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files into staticfiles directory
python manage.py collectstatic --no-input

# Synchronize database migrations with Supabase schema
python manage.py migrate --fake || true
python manage.py migrate --fake-initial || true
python manage.py migrate || true
