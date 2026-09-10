from django.db import migrations

def normalize_assigned_status(apps, schema_editor):
    Device = apps.get_model('inventory', 'Device')
    Device.objects.filter(current_status='ASSIGNED').update(current_status='IN_STOCK')

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_alter_device_variant'),
    ]

    operations = [
        migrations.RunPython(normalize_assigned_status, reverse_code=migrations.RunPython.noop),
    ]
