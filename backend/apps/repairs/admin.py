from django.contrib import admin
from .models import Repair

@admin.register(Repair)
class RepairAdmin(admin.ModelAdmin):
    list_display = ('id', 'device', 'repair_center', 'status', 'sent_date', 'returned_date', 'repair_cost')
    list_filter = ('status', 'repair_center', 'country')
    search_fields = ('device__imei', 'issue_description', 'repair_center', 'repair_notes')
