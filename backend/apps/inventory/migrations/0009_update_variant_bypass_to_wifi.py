from django.db import migrations, models

def migrate_bypass_to_wifi(apps, schema_editor):
    Device = apps.get_model('inventory', 'Device')
    Device.objects.filter(variant='Bypass').update(variant='WIFI')

def migrate_wifi_to_bypass(apps, schema_editor):
    Device = apps.get_model('inventory', 'Device')
    Device.objects.filter(variant='WIFI').update(variant='Bypass')

class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0008_alter_device_current_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='device',
            name='variant',
            field=models.CharField(
                blank=True,
                choices=[
                    ('Modified', 'Modified'),
                    ('USA eSim', 'USA eSim'),
                    ('Canada', 'Canada'),
                    ('Mexican', 'Mexican'),
                    ('Korea', 'Korea'),
                    ('Singapore', 'Singapore'),
                    ('WIFI', 'WIFI'),
                ],
                help_text='Device variant',
                max_length=50,
                null=True,
            ),
        ),
        migrations.RunPython(migrate_bypass_to_wifi, migrate_wifi_to_bypass),
    ]
