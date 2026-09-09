from django.contrib import admin
from .models import Device, CarrierInformation, Warranty, DeviceAssignment, DeviceHistory, Photo, Note

class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1

class NoteInline(admin.TabularInline):
    model = Note
    extra = 1

class WarrantyInline(admin.TabularInline):
    model = Warranty
    extra = 1

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('imei', 'model', 'capacity', 'color', 'current_status', 'battery_health', 'current_owner', 'current_shipment', 'created_at')
    list_filter = ('current_status', 'demo_unit', 'refurbished', 'purchase_country', 'icloud_status', 'sim_lock_status')
    search_fields = ('imei', 'imei2', 'serial_number', 'meid', 'model', 'model_description', 'notes')
    inlines = [PhotoInline, NoteInline, WarrantyInline]
    ordering = ('-created_at',)

@admin.register(CarrierInformation)
class CarrierInformationAdmin(admin.ModelAdmin):
    list_display = ('device', 'carrier_name', 'lock_status')
    search_fields = ('device__imei', 'carrier_name', 'lock_status')

@admin.register(Warranty)
class WarrantyAdmin(admin.ModelAdmin):
    list_display = ('device', 'provider', 'start_date', 'end_date', 'claim_status')
    list_filter = ('provider', 'claim_status')

@admin.register(DeviceAssignment)
class DeviceAssignmentAdmin(admin.ModelAdmin):
    list_display = ('device', 'employee', 'assigned_date', 'returned_date', 'is_active')
    list_filter = ('is_active',)

@admin.register(DeviceHistory)
class DeviceHistoryAdmin(admin.ModelAdmin):
    list_display = ('device', 'user', 'action_type', 'created_at')
    ordering = ('-created_at',)

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('device', 'photo_type', 'caption', 'created_at')

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('device', 'author', 'created_at')
