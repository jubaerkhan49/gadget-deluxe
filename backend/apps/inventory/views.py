import io
import qrcode
from decimal import Decimal
from django.utils import timezone
from django.shortcuts import render, get_object_or_404, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse, JsonResponse
from django.db.models import Q, Case, When, Value, IntegerField
from django.contrib import messages
from django.core.paginator import Paginator

from .models import Device, DeviceStatus, DeviceVariant, DeviceAssignment, DeviceHistory, Photo, Note, CarrierInformation, Warranty
from apps.accounts.models import User
from apps.shipments.models import Shipment
from apps.sales.models import Sale
from apps.repairs.models import Repair
from apps.sickw.models import SickwReport

class DeviceListView(LoginRequiredMixin, View):
    def get(self, request):
        queryset = Device.objects.select_related('current_owner', 'current_shipment').all()

        # Status filter
        status_filter = request.GET.get('status')
        if status_filter:
            queryset = queryset.filter(current_status=status_filter)

        # Variant filter
        variant_filter = request.GET.get('variant')
        if variant_filter:
            queryset = queryset.filter(variant=variant_filter)

        # Owner filter
        owner_filter = request.GET.get('owner')
        if owner_filter:
            if owner_filter == 'unassigned':
                queryset = queryset.filter(current_owner__isnull=True)
            else:
                queryset = queryset.filter(current_owner_id=owner_filter)

        # Keyword search
        q = request.GET.get('q')
        if q:
            queryset = queryset.filter(
                Q(imei__icontains=q) |
                Q(imei2__icontains=q) |
                Q(serial_number__icontains=q) |
                Q(meid__icontains=q) |
                Q(model__icontains=q) |
                Q(model_description__icontains=q) |
                Q(variant__icontains=q) |
                Q(current_owner__username__icontains=q) |
                Q(current_owner__first_name__icontains=q) |
                Q(current_owner__last_name__icontains=q)
            )

        # Order by IN_STOCK first, followed by other active statuses and then newest creation date
        queryset = queryset.annotate(
            status_priority=Case(
                When(current_status=DeviceStatus.IN_STOCK, then=Value(0)),
                When(current_status=DeviceStatus.ASSIGNED, then=Value(1)),
                When(current_status=DeviceStatus.WAITING_SHIPMENT, then=Value(2)),
                When(current_status=DeviceStatus.UNDER_REPAIR, then=Value(3)),
                When(current_status=DeviceStatus.SOLD, then=Value(4)),
                default=Value(5),
                output_field=IntegerField(),
            )
        ).order_by('status_priority', '-created_at')

        paginator = Paginator(queryset, 20)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number)

        owners = User.objects.filter(is_active=True).order_by('username')

        context = {
            'page_obj': page_obj,
            'status_choices': DeviceStatus.choices,
            'variant_choices': DeviceVariant.choices,
            'owners': owners,
            'current_status_filter': status_filter or '',
            'current_variant_filter': variant_filter or '',
            'current_owner_filter': owner_filter or '',
            'search_query': q or '',
            'total_count': queryset.count(),
        }
        return render(request, 'inventory/list.html', context)

class DeviceDetailView(LoginRequiredMixin, View):
    def get(self, request, pk):
        device = get_object_or_404(
            Device.objects.select_related('current_owner', 'current_shipment'),
            pk=pk
        )
        warranties = device.warranties.all()
        assignments = device.assignments.select_related('employee').all()
        history = device.history.select_related('user').all()
        photos = device.photos.all()
        notes = device.device_notes.select_related('author').all()
        repairs = device.repairs.all()
        sales = device.sales.select_related('customer', 'seller').all()
        sickw_reports = device.sickw_reports.all()
        employees = User.objects.all()

        latest_sale = sales.first()

        context = {
            'device': device,
            'warranties': warranties,
            'assignments': assignments,
            'history': history,
            'photos': photos,
            'notes': notes,
            'repairs': repairs,
            'sales': sales,
            'latest_sale': latest_sale,
            'sickw_reports': sickw_reports,
            'status_choices': DeviceStatus.choices,
            'variant_choices': DeviceVariant.choices,
            'employees': employees,
            'shipments': Shipment.objects.all(),
        }
        return render(request, 'inventory/detail.html', context)

class DeviceCreateView(LoginRequiredMixin, View):
    def get(self, request):
        shipments = Shipment.objects.all()
        return render(request, 'inventory/form.html', {
            'shipments': shipments,
            'status_choices': DeviceStatus.choices,
            'variant_choices': DeviceVariant.choices,
        })

    def post(self, request):
        data = request.POST
        imei = data.get('imei', '').strip()
        model = data.get('model', '').strip()
        buying_price_raw = data.get('buying_price', '').strip()

        if not imei or not model or not buying_price_raw:
            messages.error(request, "IMEI, Model Name, and Buying Price are required fields.")
            return render(request, 'inventory/form.html', {
                'shipments': Shipment.objects.all(),
                'status_choices': DeviceStatus.choices,
                'variant_choices': DeviceVariant.choices,
            })

        try:
            buying_price = Decimal(buying_price_raw)
        except Exception:
            messages.error(request, "Please enter a valid numeric Buying Price.")
            return render(request, 'inventory/form.html', {
                'shipments': Shipment.objects.all(),
                'status_choices': DeviceStatus.choices,
                'variant_choices': DeviceVariant.choices,
            })

        if Device.objects.filter(imei=imei).exists():
            messages.error(request, f"Device with IMEI {imei} already exists!")
            return render(request, 'inventory/form.html', {
                'shipments': Shipment.objects.all(),
                'status_choices': DeviceStatus.choices,
                'variant_choices': DeviceVariant.choices,
            })

        shipment_id = data.get('current_shipment')
        shipment = Shipment.objects.filter(id=shipment_id).first() if shipment_id else None

        device = Device.objects.create(
            imei=imei,
            imei2=data.get('imei2', '').strip() or None,
            meid=data.get('meid', '').strip() or None,
            serial_number=data.get('serial_number', '').strip() or None,
            model=model,
            model_description=data.get('model_description', '').strip() or None,
            capacity=data.get('capacity', '').strip() or None,
            color=data.get('color', '').strip() or None,
            battery_health=int(data['battery_health']) if data.get('battery_health') else None,
            variant=data.get('variant', '').strip() or None,
            buying_price=buying_price,
            notes=data.get('notes', '').strip() or None,
            current_status=data.get('current_status', DeviceStatus.WAITING_SHIPMENT),
            current_shipment=shipment
        )

        DeviceHistory.objects.create(
            device=device,
            user=request.user,
            action_type='CREATION',
            new_state=f"Device registered with status {device.current_status}"
        )

        messages.success(request, f"Device {device.model} (IMEI: {device.imei}) added successfully.")
        return redirect('inventory:detail', pk=device.id)

class DeviceAssignView(LoginRequiredMixin, View):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        employee_id = request.POST.get('employee_id')
        notes = request.POST.get('notes', '')

        if not employee_id:
            messages.error(request, "Please select an employee.")
            return redirect('inventory:detail', pk=pk)

        employee = get_object_or_404(User, pk=employee_id)

        # Deactivate existing active assignment
        DeviceAssignment.objects.filter(device=device, is_active=True).update(is_active=False)

        # Create new assignment record
        DeviceAssignment.objects.create(
            device=device,
            employee=employee,
            notes=notes,
            is_active=True
        )

        old_owner = device.current_owner.username if device.current_owner else "None"
        device.current_owner = employee
        device.current_status = DeviceStatus.ASSIGNED
        device.save()

        # Sync seller on sales record to match newly assigned employee
        Sale.objects.filter(device=device).update(seller=employee)

        DeviceHistory.objects.create(
            device=device,
            user=request.user,
            action_type='ASSIGNMENT',
            old_state=f"Owner: {old_owner}",
            new_state=f"Assigned to {employee.username}"
        )

        messages.success(request, f"Device assigned to {employee.get_full_name() or employee.username}.")
        return redirect('inventory:detail', pk=pk)

class DeviceStatusUpdateView(LoginRequiredMixin, View):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        new_status = request.POST.get('status')
        old_status = device.get_current_status_display()

        if new_status in dict(DeviceStatus.choices):
            device.current_status = new_status
            device.save()

            # If status changed away from UNDER_REPAIR (e.g. to IN_STOCK, ASSIGNED, SOLD), complete active repair records
            if new_status != DeviceStatus.UNDER_REPAIR:
                from apps.repairs.models import Repair, RepairStatus
                active_repairs = Repair.objects.filter(device=device, status=RepairStatus.IN_PROGRESS)
                if active_repairs.exists():
                    for repair in active_repairs:
                        repair.status = RepairStatus.COMPLETED
                        if not repair.returned_date:
                            repair.returned_date = timezone.now().date()
                        repair.save()

            # If status changed to UNDER_REPAIR, create repair log
            if new_status == DeviceStatus.UNDER_REPAIR:
                issue_description = request.POST.get('issue_description', '').strip() or "Device sent to repair lab"
                repair_center = request.POST.get('repair_center', 'Shenzhen Authorized Lab').strip()
                repair_cost = Decimal(request.POST.get('repair_cost', '0.00'))

                from apps.repairs.models import Repair
                Repair.objects.create(
                    device=device,
                    issue_description=issue_description,
                    sent_date=timezone.now().date(),
                    repair_center=repair_center,
                    repair_cost=repair_cost,
                    status='IN_PROGRESS'
                )
                messages.success(request, f"Device status updated to Under Repair and Repair record created.")

            # If status changed to SOLD, create sales log
            elif new_status == DeviceStatus.SOLD:
                selling_price = Decimal(request.POST.get('selling_price', '0.00') or '0.00')
                commission_amount = Decimal(request.POST.get('commission_amount', '0.00') or '0.00')
                buying_price = device.buying_price
                
                # Check active assignment or current owner for Seller
                active_assignment = DeviceAssignment.objects.filter(device=device, is_active=True).first()
                if active_assignment and active_assignment.employee:
                    seller = active_assignment.employee
                elif device.current_owner:
                    seller = device.current_owner
                else:
                    seller = request.user

                from apps.sales.models import Sale
                import uuid

                existing_sale = Sale.objects.filter(device=device).first()
                if existing_sale:
                    existing_sale.seller = seller
                    if selling_price > 0:
                        existing_sale.selling_price = selling_price
                    if commission_amount > 0:
                        existing_sale.commission_amount = commission_amount
                    existing_sale.buying_price = buying_price
                    existing_sale.save()
                    invoice_number = existing_sale.invoice_number
                else:
                    invoice_number = f"INV-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                    Sale.objects.create(
                        device=device,
                        customer=None,
                        seller=seller,
                        buying_price=buying_price,
                        selling_price=selling_price,
                        commission_amount=commission_amount,
                        discount=Decimal('0.00'),
                        invoice_number=invoice_number,
                        payment_status='PAID'
                    )
                messages.success(request, f"Device status updated to Sold and Sale Invoice #{invoice_number} created (Seller: {seller.username}).")
            else:
                messages.success(request, f"Device status updated to {device.get_current_status_display()}.")

            DeviceHistory.objects.create(
                device=device,
                user=request.user,
                action_type='STATUS_UPDATE',
                old_state=old_status,
                new_state=device.get_current_status_display()
            )

        return redirect('inventory:detail', pk=pk)

class DeviceSpecsUpdateView(LoginRequiredMixin, View):
    """Allows manual updating of hardware specs (Color, Battery Health, Cycle Count, Variant)."""
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        
        color = request.POST.get('color', '').strip()
        battery_health = request.POST.get('battery_health', '').strip()
        battery_cycle = request.POST.get('battery_cycle', '').strip()
        variant = request.POST.get('variant', '').strip()

        if color:
            device.color = color
        if battery_health:
            try:
                device.battery_health = int(battery_health)
            except ValueError:
                pass
        if battery_cycle:
            try:
                device.battery_cycle = int(battery_cycle)
            except ValueError:
                pass
        if variant:
            device.variant = variant

        device.save()

        DeviceHistory.objects.create(
            device=device,
            user=request.user,
            action_type='UPDATE',
            new_state=f"Hardware specs updated: Color={device.color}, Health={device.battery_health}%, Cycles={device.battery_cycle}"
        )

        messages.success(request, "Hardware specs (Color, Battery Health, Cycle Count) updated successfully.")
        return redirect('inventory:detail', pk=pk)


class DeviceOwnershipUpdateView(LoginRequiredMixin, View):
    """Allows updating Variant, Owner, Buying Price, and Selling Price."""
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)

        variant = request.POST.get('variant', '').strip()
        buying_price = request.POST.get('buying_price', '').strip()
        selling_price = request.POST.get('selling_price', '').strip()
        owner_id = request.POST.get('owner_id', '').strip()

        changes = []

        if variant != (device.variant or ''):
            old_v = device.variant or 'None'
            device.variant = variant or None
            changes.append(f"Variant: {old_v} -> {variant or 'None'}")

        if buying_price:
            try:
                bp_dec = Decimal(buying_price)
                if bp_dec != device.buying_price:
                    old_bp = device.buying_price
                    device.buying_price = bp_dec
                    changes.append(f"Buying Price: BDT {old_bp} -> BDT {bp_dec}")
            except Exception:
                pass

        if selling_price:
            try:
                sp_dec = Decimal(selling_price)
                latest_sale = device.sales.first()
                if latest_sale and latest_sale.selling_price != sp_dec:
                    old_sp = latest_sale.selling_price
                    latest_sale.selling_price = sp_dec
                    latest_sale.save()
                    changes.append(f"Selling Price: BDT {old_sp} -> BDT {sp_dec}")
            except Exception:
                pass

        if owner_id == "":
            if device.current_owner is not None:
                device.current_owner = None
                changes.append("Owner unassigned")
        elif owner_id:
            try:
                new_owner = User.objects.get(id=owner_id)
                if device.current_owner != new_owner:
                    device.current_owner = new_owner
                    changes.append(f"Owner assigned to {new_owner.username}")
            except User.DoesNotExist:
                pass

        device.save()

        if changes:
            DeviceHistory.objects.create(
                device=device,
                user=request.user,
                action_type='UPDATE',
                new_state="; ".join(changes)
            )
            messages.success(request, "Details updated successfully.")
        else:
            messages.info(request, "No changes detected.")

        return redirect('inventory:detail', pk=pk)


class DeviceQRCodeView(View):
    """Generates PNG QR code linking to device detail web URL."""
    def get(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        url = request.build_absolute_uri(f"/inventory/{device.id}/")
        
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return HttpResponse(buffer.getvalue(), content_type='image/png')

class GlobalSearchView(LoginRequiredMixin, View):
    """Instant HTMX Global Search returning matching devices, shipments, and sales."""
    def get(self, request):
        q = request.GET.get('q', '').strip()
        if not q or len(q) < 2:
            return HttpResponse('')

        devices = Device.objects.filter(
            Q(imei__icontains=q) |
            Q(imei2__icontains=q) |
            Q(serial_number__icontains=q) |
            Q(meid__icontains=q) |
            Q(model__icontains=q) |
            Q(purchase_country__icontains=q)
        )[:6]

        shipments = Shipment.objects.filter(
            Q(tracking_number__icontains=q) |
            Q(shipping_company__icontains=q)
        )[:3]

        sales = Sale.objects.filter(
            Q(invoice_number__icontains=q) |
            Q(customer__name__icontains=q)
        )[:3]

        context = {
            'devices': devices,
            'shipments': shipments,
            'sales': sales,
            'query': q,
        }
        return render(request, 'inventory/partials/search_results.html', context)


class DeviceDeleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        device = get_object_or_404(Device, pk=pk)
        model_name = device.model
        ident = device.imei or device.serial_number or f"ID #{device.id}"

        # Clean up related records protected by foreign keys if any
        device.sales.all().delete()
        device.delete()

        messages.success(request, f"Device '{model_name}' ({ident}) deleted successfully.")
        return redirect('inventory:list')

