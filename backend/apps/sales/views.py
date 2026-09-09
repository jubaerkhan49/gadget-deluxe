import uuid
from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from decimal import Decimal

from .models import Sale
from apps.inventory.models import Device, DeviceStatus, DeviceHistory
from apps.customers.models import Customer

class SaleListView(LoginRequiredMixin, View):
    def get(self, request):
        sales = Sale.objects.select_related('device', 'customer', 'seller').all()
        in_stock_devices = Device.objects.filter(current_status=DeviceStatus.IN_STOCK)
        customers = Customer.objects.all()
        return render(request, 'sales/list.html', {
            'sales': sales,
            'in_stock_devices': in_stock_devices,
            'customers': customers
        })

    def post(self, request):
        device_id = request.POST.get('device_id')
        customer_id = request.POST.get('customer_id')
        selling_price = Decimal(request.POST.get('selling_price', '0.00') or '0.00')
        discount = Decimal(request.POST.get('discount', '0.00') or '0.00')
        commission_amount = Decimal(request.POST.get('commission_amount', '0.00') or '0.00')
        payment_method = request.POST.get('payment_method', 'CASH')

        if not device_id or not customer_id:
            messages.error(request, "Device and Customer selection are required.")
            return redirect('sales:list')

        device = get_object_or_404(Device, pk=device_id)
        customer = get_object_or_404(Customer, pk=customer_id)

        # Automatically use the known device buying price
        buying_price_raw = request.POST.get('buying_price', '').strip()
        if buying_price_raw:
            try:
                buying_price = Decimal(buying_price_raw)
            except Exception:
                buying_price = device.buying_price
        else:
            buying_price = device.buying_price

        seller = device.current_owner or request.user
        invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"

        sale = Sale.objects.create(
            device=device,
            customer=customer,
            seller=seller,
            buying_price=buying_price,
            selling_price=selling_price,
            discount=discount,
            commission_amount=commission_amount,
            payment_status='PAID',
            payment_method=payment_method,
            invoice_number=invoice_number
        )

        # Update Device Status to SOLD
        device.current_status = DeviceStatus.SOLD
        device.save()

        DeviceHistory.objects.create(
            device=device,
            user=request.user,
            action_type='SALE',
            old_state='In Stock',
            new_state=f"Sold via Invoice {invoice_number} for ${selling_price}"
        )

        messages.success(request, f"Sale processed! Invoice #{invoice_number} created (Profit: ${sale.profit}).")
        return redirect('sales:list')


class SaleDeleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        sale = get_object_or_404(Sale, pk=pk)
        invoice_number = sale.invoice_number
        device = sale.device

        # Revert device status to IN_STOCK if it was marked as SOLD
        if device:
            if device.current_status == DeviceStatus.SOLD:
                device.current_status = DeviceStatus.IN_STOCK
                device.save()

            DeviceHistory.objects.create(
                device=device,
                user=request.user,
                action_type='STATUS_CHANGE',
                old_state='Sold',
                new_state=f"Sale invoice #{invoice_number} deleted. Device returned to In Stock."
            )

        sale.delete()
        messages.success(request, f"Sale invoice #{invoice_number} deleted successfully.")
        return redirect('sales:list')

