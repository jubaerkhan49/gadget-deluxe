from django.shortcuts import render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.inventory.models import Device, DeviceStatus
from apps.sales.models import Sale
from apps.shipments.models import Shipment
from apps.accounts.models import User

class DashboardIndexView(LoginRequiredMixin, View):
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Inventory Stats
        total_devices = Device.objects.count()
        in_stock_count = Device.objects.filter(current_status=DeviceStatus.IN_STOCK).count()
        sold_count = Device.objects.filter(current_status=DeviceStatus.SOLD).count()
        waiting_shipment_count = Device.objects.filter(current_status=DeviceStatus.WAITING_SHIPMENT).count()
        repair_count = Device.objects.filter(current_status=DeviceStatus.UNDER_REPAIR).count()
        returned_count = Device.objects.filter(current_status=DeviceStatus.RETURNED).count()

        # Financial & Asset Metrics
        total_assets = Device.objects.exclude(current_status=DeviceStatus.SOLD).aggregate(total=Sum('buying_price'))['total'] or Decimal('0.00')
        today_sales_qs = Sale.objects.filter(sale_date__gte=today_start)
        today_sales = today_sales_qs.aggregate(total=Sum('selling_price'))['total'] or Decimal('0.00')
        today_profit = today_sales_qs.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')

        monthly_sales_qs = Sale.objects.filter(sale_date__gte=month_start)
        monthly_profit = monthly_sales_qs.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')

        # Top Seller
        top_seller_data = Sale.objects.filter(sale_date__gte=month_start)\
                                      .values('seller__username')\
                                      .annotate(total_sales=Count('id'))\
                                      .order_by('-total_sales').first()
        top_seller = top_seller_data['seller__username'] if top_seller_data else "N/A"

        # Latest Shipment
        latest_shipment = Shipment.objects.order_by('-receive_date', '-created_at').first()

        # Recent Activity & Recent Sales
        recent_sales = Sale.objects.select_related('device', 'customer', 'seller').order_by('-sale_date')[:5]
        recent_devices = Device.objects.select_related('current_owner', 'current_shipment').order_by('-created_at')[:8]

        context = {
            'total_devices': total_devices,
            'in_stock_count': in_stock_count,
            'sold_count': sold_count,
            'waiting_shipment_count': waiting_shipment_count,
            'repair_count': repair_count,
            'returned_count': returned_count,
            'today_sales': today_sales,
            'today_profit': today_profit,
            'total_assets': total_assets,
            'monthly_profit': monthly_profit,
            'top_seller': top_seller,
            'latest_shipment': latest_shipment,
            'recent_sales': recent_sales,
            'recent_devices': recent_devices,
        }

        if request.headers.get('HX-Request'):
            return render(request, 'dashboard/partials/stats_cards.html', context)

        return render(request, 'dashboard/index.html', context)
