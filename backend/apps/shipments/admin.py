from django.contrib import admin
from .models import Supplier, Shipment

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'email', 'country')
    search_fields = ('name', 'contact_person', 'email', 'phone')

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('tracking_number', 'supplier', 'shipping_company', 'receive_date', 'shipping_cost', 'country')
    list_filter = ('supplier', 'shipping_company', 'country')
    search_fields = ('tracking_number', 'shipping_company', 'notes')
