from decimal import Decimal
import re
from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.db import models
from .models import Shipment, Supplier
from apps.inventory.models import Device, DeviceStatus, DeviceVariant, DeviceHistory

class ShipmentListView(LoginRequiredMixin, View):
    def get(self, request):
        shipments = Shipment.objects.select_related('supplier').prefetch_related('devices').all()
        suppliers = Supplier.objects.all()
        return render(request, 'shipments/list.html', {
            'shipments': shipments,
            'suppliers': suppliers,
            'variant_choices': DeviceVariant.choices,
        })

    def post(self, request):
        tracking_number = request.POST.get('tracking_number', '').strip()
        supplier_name = request.POST.get('supplier_name', '').strip()
        product_name = request.POST.get('product_name', '').strip()
        product_identifier = request.POST.get('product_identifier', '').strip()
        variant = request.POST.get('variant', '').strip()
        capacity = request.POST.get('capacity', '').strip()
        color = request.POST.get('color', '').strip()

        shipping_company = request.POST.get('shipping_company', '').strip()
        item_price = Decimal(request.POST.get('item_price', '0.00') or '0.00')
        shipment_fees = Decimal(request.POST.get('shipment_fees', '0.00') or '0.00')
        discount = Decimal(request.POST.get('discount', '0.00') or '0.00')

        if not tracking_number:
            messages.error(request, "Tracking Number is required.")
            return redirect('shipments:list')

        shipment = Shipment.objects.filter(tracking_number=tracking_number).first()
        if shipment and not supplier_name:
            supplier = shipment.supplier
        elif supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
        else:
            messages.error(request, "Supplier Name is required for new shipments.")
            return redirect('shipments:list')

        if not shipment:
            shipment = Shipment.objects.create(
                tracking_number=tracking_number,
                supplier=supplier,
                shipping_company=shipping_company or None,
                shipping_cost=Decimal('0.00'),
                discount=discount
            )
        else:
            if supplier_name:
                shipment.supplier = supplier
            if shipping_company:
                shipment.shipping_company = shipping_company
            if discount > 0:
                shipment.discount = discount
            shipment.save()

        # Process product entry if product_name or product_identifier provided
        desc_parts = [product_name, capacity, color]
        model_description = " ".join([p for p in desc_parts if p]).strip()

        created_count = 0
        updated_count = 0

        raw_identifiers = []
        if product_name or product_identifier:
            raw_identifiers = [i.strip() for i in re.split(r'[\r\n,\s]+', product_identifier) if i.strip()]
            if not raw_identifiers and product_name:
                raw_identifiers = ['']

            total_units = len(raw_identifiers) if raw_identifiers else 1
            gross_shipping = shipment_fees * total_units
            net_shipping = max(gross_shipping - discount, Decimal('0.00'))
            effective_unit_shipping = (net_shipping / Decimal(str(total_units))).quantize(Decimal('0.01')) if total_units > 0 else Decimal('0.00')
            total_buying_price = item_price + effective_unit_shipping

            for identifier in raw_identifiers:
                if not identifier and not product_name:
                    continue

                # Check if device already exists with matching imei or serial_number
                device = None
                if identifier:
                    device = Device.objects.filter(
                        models.Q(imei=identifier) | models.Q(serial_number=identifier)
                    ).first()

                if device:
                    device.current_shipment = shipment
                    if product_name:
                        device.model = product_name
                    if capacity:
                        device.capacity = capacity
                    if color:
                        device.color = color
                    if variant:
                        device.variant = variant
                    if model_description:
                        device.model_description = model_description
                    device.current_status = DeviceStatus.WAITING_SHIPMENT
                    if total_buying_price > 0:
                        device.buying_price = total_buying_price
                    device.save()

                    DeviceHistory.objects.create(
                        device=device,
                        user=request.user,
                        action_type='UPDATE',
                        new_state=f"Device updated via Shipment #{tracking_number} (Cost: BDT {total_buying_price})"
                    )
                    updated_count += 1
                else:
                    # Determine IMEI vs Serial Number format
                    if identifier and (identifier.isdigit() and len(identifier) in [14, 15]):
                        imei_val = identifier
                        sn_val = ""
                    elif identifier:
                        imei_val = f"ID-{identifier}"
                        sn_val = identifier
                    else:
                        import uuid
                        imei_val = f"TMP-{uuid.uuid4().hex[:10].upper()}"
                        sn_val = ""

                    if Device.objects.filter(imei=imei_val).exists():
                        imei_val = f"{imei_val}-{shipment.id}"

                    new_device = Device.objects.create(
                        imei=imei_val,
                        serial_number=sn_val,
                        model=product_name or "Standard Device",
                        capacity=capacity or None,
                        color=color or None,
                        variant=variant or None,
                        model_description=model_description or None,
                        buying_price=total_buying_price,
                        current_shipment=shipment,
                        current_status=DeviceStatus.WAITING_SHIPMENT
                    )

                    DeviceHistory.objects.create(
                        device=new_device,
                        user=request.user,
                        action_type='CREATION',
                        new_state=f"Device registered via Shipment #{tracking_number} (Cost: BDT {total_buying_price})"
                    )
                    created_count += 1

        total_processed = created_count + updated_count
        
        # Calculate total shipment bill: shipment_fees (per unit) * total devices in this shipment batch
        if shipment_fees > 0:
            dev_count = shipment.devices.count()
            shipment.shipping_cost = shipment_fees * max(dev_count, 1)
            shipment.discount = discount
            shipment.save(update_fields=['shipping_cost', 'discount'])

        if total_processed > 0:
            net_bill = shipment.net_shipping_cost
            messages.success(request, f"Shipment #{tracking_number} saved ({total_processed} items). Net Shipment Bill: BDT {net_bill} (Discount/Cashback: BDT {discount}).")
        else:
            messages.success(request, f"Shipment #{tracking_number} saved successfully.")

        return redirect('shipments:list')


class ShipmentUpdateView(LoginRequiredMixin, View):
    def post(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk)

        tracking_number = request.POST.get('tracking_number', '').strip()
        supplier_name = request.POST.get('supplier_name', '').strip()
        shipping_company = request.POST.get('shipping_company', '').strip()
        receive_date = request.POST.get('receive_date', '').strip()
        notes = request.POST.get('notes', '').strip()

        fee_per_unit_raw = request.POST.get('fee_per_unit', '').strip()
        discount_raw = request.POST.get('discount', '').strip()
        shipping_cost_raw = request.POST.get('shipping_cost', '').strip()

        if tracking_number:
            shipment.tracking_number = tracking_number

        if supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
            shipment.supplier = supplier

        shipment.shipping_company = shipping_company or None
        shipment.receive_date = receive_date if receive_date else None
        shipment.notes = notes or None

        dev_count = shipment.devices.count()

        # Update Discount/Cashback
        if discount_raw:
            try:
                shipment.discount = Decimal(discount_raw)
            except Exception:
                pass
        else:
            shipment.discount = Decimal('0.00')

        # Update Gross shipping cost
        if fee_per_unit_raw:
            try:
                fee_per_unit = Decimal(fee_per_unit_raw)
                shipment.shipping_cost = fee_per_unit * max(dev_count, 1)
            except Exception:
                pass
        elif shipping_cost_raw:
            try:
                shipment.shipping_cost = Decimal(shipping_cost_raw)
            except Exception:
                pass

        shipment.save()
        messages.success(request, f"Shipment #{shipment.tracking_number} updated. Net Bill: BDT {shipment.net_shipping_cost} (Gross: BDT {shipment.shipping_cost}, Cashback: BDT {shipment.discount}).")
        return redirect('shipments:list')


class ShipmentDeleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        shipment = get_object_or_404(Shipment, pk=pk)
        tracking_num = shipment.tracking_number
        delete_devices = request.POST.get('delete_devices') in ['1', 'on', 'true']

        if delete_devices:
            devices = list(shipment.devices.all())
            deleted_dev_count = 0
            for dev in devices:
                if not dev.sales.exists():
                    dev.delete()
                    deleted_dev_count += 1
                else:
                    dev.current_shipment = None
                    dev.save()
            if deleted_dev_count > 0:
                messages.success(request, f"Shipment #{tracking_num} and {deleted_dev_count} associated device(s) deleted successfully.")
            else:
                messages.success(request, f"Shipment #{tracking_num} deleted successfully (devices were preserved because of existing sales).")
        else:
            shipment.devices.update(current_shipment=None)
            messages.success(request, f"Shipment #{tracking_num} deleted successfully.")

        shipment.delete()
        return redirect('shipments:list')


