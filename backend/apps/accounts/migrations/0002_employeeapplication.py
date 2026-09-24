from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeApplication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(help_text='Full Name of applicant', max_length=150)),
                ('nickname', models.CharField(blank=True, help_text='Preferred nickname / short name', max_length=100, null=True)),
                ('phone', models.CharField(help_text='Contact phone number', max_length=30)),
                ('email', models.EmailField(help_text='Contact & Login email address', max_length=254)),
                ('nid_number', models.CharField(help_text='National ID / Passport number', max_length=50)),
                ('address', models.TextField(help_text='Residential / Permanent address')),
                ('photo', models.TextField(blank=True, help_text='Base64 encoded image string (must be under 100KB)', null=True)),
                ('password', models.CharField(help_text='Desired password for employee login upon approval', max_length=128)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], db_index=True, default='PENDING', max_length=20)),
                ('review_notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='joined_application', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_employee_applications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
