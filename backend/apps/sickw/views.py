from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse
from django.contrib import messages

from .models import SickwReport
from .parser import SickwParser
from apps.inventory.models import Device, DeviceStatus, DeviceHistory

class SickwParserView(LoginRequiredMixin, View):
    def get(self, request):
        initial_imei = request.GET.get('imei', '')
        return render(request, 'sickw/parser.html', {'initial_imei': initial_imei})

    def post(self, request):
        raw_text = request.POST.get('raw_text', '')
        action = request.POST.get('action')

        parsed = SickwParser.parse(raw_text)

        if action == 'parse_preview' or request.headers.get('HX-Request'):
            return render(request, 'sickw/partials/parsed_preview.html', {
                'raw_text': raw_text,
                'parsed': parsed
            })

        if action == 'save_device':
            imei = parsed.get('imei') or request.POST.get('imei')
            if not imei:
                messages.error(request, "Could not extract valid IMEI from Sickw report.")
                return render(request, 'sickw/parser.html', {'raw_text': raw_text, 'parsed': parsed})

            # Parse estimated purchase date safely if present
            purchase_date = None
            raw_date = parsed.get('estimated_purchase_date')
            if raw_date:
                try:
                    from datetime import datetime
                    purchase_date = datetime.strptime(raw_date.strip(), "%Y-%m-%d").date()
                except Exception:
                    purchase_date = None

            from django.db import models
            device = Device.objects.filter(models.Q(imei=imei) | models.Q(imei2=imei)).first()

            if device:
                # Aggregate parsed Sickw technical data to existing device
                if parsed.get('model_description'): device.model_description = parsed.get('model_description')
                if parsed.get('capacity'):
                    device.capacity = parsed.get('capacity')
                    device.storage = parsed.get('capacity')
                if parsed.get('imei2'): device.imei2 = parsed.get('imei2')
                if parsed.get('meid'): device.meid = parsed.get('meid')
                if parsed.get('serial_number'): device.serial_number = parsed.get('serial_number')
                if purchase_date: device.estimated_purchase_date = purchase_date
                if parsed.get('warranty_status'): device.warranty_status = parsed.get('warranty_status')
                if parsed.get('icloud_lock'): device.icloud_status = parsed.get('icloud_lock')
                if parsed.get('sim_lock_status'): device.sim_lock_status = parsed.get('sim_lock_status')
                if parsed.get('locked_carrier'): device.carrier_policy = parsed.get('locked_carrier')
                if parsed.get('purchase_country'): device.purchase_country = parsed.get('purchase_country')
                device.save()
                created_msg = f"Sickw technical specs (Model Description, Capacity, IMEI, IMEI2, MEID, Serial, Purchase Date) aggregated to existing device {device.model} ({device.imei})."
            else:
                model = parsed.get('model') or parsed.get('model_description') or 'Unknown Model'
                device = Device.objects.create(
                    imei=imei,
                    model=model,
                    model_description=parsed.get('model_description'),
                    capacity=parsed.get('capacity'),
                    imei2=parsed.get('imei2'),
                    meid=parsed.get('meid'),
                    serial_number=parsed.get('serial_number'),
                    estimated_purchase_date=purchase_date,
                    warranty_status=parsed.get('warranty_status'),
                    icloud_status=parsed.get('icloud_lock'),
                    purchase_country=parsed.get('purchase_country'),
                    carrier_policy=parsed.get('locked_carrier'),
                    sim_lock_status=parsed.get('sim_lock_status'),
                    current_status=DeviceStatus.WAITING_SHIPMENT
                )
                created_msg = f"Sickw Report parsed and new device {device.model} ({device.imei}) saved successfully!"

            # Create SickwReport record
            report = SickwReport.objects.create(
                device=device,
                raw_text=raw_text,
                parsed_data=parsed,
                model_description=parsed.get('model_description'),
                model=device.model,
                imei=imei,
                imei2=parsed.get('imei2'),
                meid=parsed.get('meid'),
                serial_number=parsed.get('serial_number'),
                estimated_purchase_date=purchase_date,
                warranty_status=parsed.get('warranty_status'),
                icloud_lock=parsed.get('icloud_lock'),
                demo_unit=parsed.get('demo_unit'),
                loaner_device=parsed.get('loaner_device'),
                replaced_device=parsed.get('replaced_device'),
                replacement_device=parsed.get('replacement_device'),
                refurbished_device=parsed.get('refurbished_device'),
                purchase_country=parsed.get('purchase_country'),
                locked_carrier=parsed.get('locked_carrier'),
                sim_lock_status=parsed.get('sim_lock_status'),
            )

            DeviceHistory.objects.create(
                device=device,
                user=request.user,
                action_type='SICKW_IMPORT',
                new_state=f"Sickw report imported (Report ID: {report.id})"
            )

            messages.success(request, created_msg)
            return redirect('inventory:detail', pk=device.id)

        return render(request, 'sickw/parser.html', {'raw_text': raw_text, 'parsed': parsed})
