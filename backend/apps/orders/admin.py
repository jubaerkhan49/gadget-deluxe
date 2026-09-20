from django.contrib import admin
from .models import OtherGoodsOrder


@admin.register(OtherGoodsOrder)
class OtherGoodsOrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_id',
        'customer_name',
        'customer_phone',
        'product_name',
        'category',
        'total_amount',
        'payment_amount',
        'due_amount',
        'tracking_status',
        'order_date'
    )
    list_filter = ('tracking_status', 'category', 'order_date')
    search_fields = ('order_id', 'customer_name', 'customer_phone', 'product_name')
    readonly_fields = ('created_at', 'updated_at')
