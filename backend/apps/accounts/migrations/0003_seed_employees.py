from django.db import migrations
import hashlib
import base64
import secrets
import string

def make_password(password, iterations=1200000):
    chars = string.ascii_letters + string.digits
    salt = ''.join(secrets.choice(chars) for _ in range(22))
    hash_bytes = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    hash_b64 = base64.b64encode(hash_bytes).decode('ascii').strip()
    return f"pbkdf2_sha256${iterations}${salt}${hash_b64}"

def seed_employees(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    employees = {
        'ochi': ('Ochi#GD789!', 'Ochi'),
        'ashraf': ('Ashraf#GD456!', 'Ashraf'),
        'emon': ('Emon#GD123!', 'Emon')
    }

    for username, (raw_pwd, first_name) in employees.items():
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': first_name,
                'role': 'EMPLOYEE',
                'is_active': True,
                'password': make_password(raw_pwd)
            }
        )
        if not created:
            user.password = make_password(raw_pwd)
            user.role = 'EMPLOYEE'
            user.first_name = first_name
            user.is_active = True
            user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_employeeapplication'),
    ]

    operations = [
        migrations.RunPython(seed_employees, reverse_code=migrations.RunPython.noop),
    ]
