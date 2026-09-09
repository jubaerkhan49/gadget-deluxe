from django.contrib import admin
from .models import Sale

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'device', 'customer', 'seller', 'buying_price', 'selling_price', 'discount', 'profit', 'payment_status', 'sale_date')
    list_filter = ('payment_status', 'payment_method', 'seller')
    search_fields = ('invoice_number', 'device__imei', 'customer__name', 'customer__phone')
    readonly_fields = ('profit',)
