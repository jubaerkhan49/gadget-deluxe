from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.utils import timezone
from decimal import Decimal

from .models import Repair, RepairStatus
from apps.inventory.models import Device, DeviceStatus, DeviceHistory

class RepairListView(LoginRequiredMixin, View):
    def get(self, request):
        repairs = Repair.objects.select_related('device').all()
        devices = Device.objects.all()
        return render(request, 'repairs/list.html', {
            'repairs': repairs,
            'devices': devices,
            'status_choices': RepairStatus.choices
        })

    def post(self, request):
        device_id = request.POST.get('device_id')
        issue = request.POST.get('issue_description', '').strip()
        repair_center = request.POST.get('repair_center', 'Shenzhen Lab').strip()
        country = request.POST.get('country', 'China').strip()
        cost = Decimal(request.POST.get('repair_cost', '0.00'))

        if not device_id or not issue:
            messages.error(request, "Device and Issue Description are required.")
            return redirect('repairs:list')

        device = get_object_or_404(Device, pk=device_id)

        repair = Repair.objects.create(
            device=device,
            issue_description=issue,
            sent_date=timezone.now().date(),
            repair_center=repair_center,
            country=country,
            repair_cost=cost,
            status=RepairStatus.IN_PROGRESS
        )

        device.current_status = DeviceStatus.UNDER_REPAIR
        device.save()

        DeviceHistory.objects.create(
            device=device,
            user=request.user,
            action_type='REPAIR',
            new_state=f"Sent for repair to {repair_center} ({country}). Issue: {issue}"
        )

        messages.success(request, f"Repair record #{repair.id} created for device {device.imei}.")
        return redirect('repairs:list')


class RepairDeleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        repair = get_object_or_404(Repair, pk=pk)
        repair_id = repair.id
        device = repair.device

        # If the device is UNDER_REPAIR and no other active repairs remain, revert to IN_STOCK
        if device and device.current_status == DeviceStatus.UNDER_REPAIR:
            has_other_repairs = Repair.objects.filter(device=device, status=RepairStatus.IN_PROGRESS).exclude(pk=pk).exists()
            if not has_other_repairs:
                device.current_status = DeviceStatus.IN_STOCK
                device.save()

                DeviceHistory.objects.create(
                    device=device,
                    user=request.user,
                    action_type='STATUS_CHANGE',
                    old_state='Under Repair',
                    new_state=f"Repair log #{repair_id} deleted. Device status restored to In Stock."
                )

        repair.delete()
        messages.success(request, f"Repair record #{repair_id} deleted successfully.")
        return redirect('repairs:list')

