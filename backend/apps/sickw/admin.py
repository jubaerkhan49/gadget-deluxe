from django.contrib import admin
from .models import SickwReport

@admin.register(SickwReport)
class SickwReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'imei', 'model', 'model_description', 'icloud_lock', 'sim_lock_status', 'created_at')
    search_fields = ('imei', 'imei2', 'serial_number', 'model', 'model_description')
    ordering = ('-created_at',)
