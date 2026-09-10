import csv
from decimal import Decimal
import re
import uuid
from django.db import models
from django.http import HttpResponse
from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from django.utils import timezone
from apps.accounts.models import User
from apps.inventory.models import Device, DeviceStatus, DeviceVariant, DeviceHistory, DeviceAssignment
from apps.shipments.models import Shipment, Supplier
from apps.customers.models import Customer
from apps.sales.models import Sale
from apps.repairs.models import Repair, RepairStatus
from apps.sickw.models import SickwReport
from apps.sickw.parser import SickwParser

from .serializers import (
    UserSerializer, DeviceSerializer, ShipmentSerializer, SupplierSerializer,
    CustomerSerializer, SaleSerializer, RepairSerializer, SickwReportSerializer
)

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint to list system users / employees for device assignment."""
    queryset = User.objects.filter(is_active=True).order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['username', 'first_name', 'last_name', 'email']

class DeviceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing device inventory.
    Filter by status, search by IMEI, IMEI2, Serial, Model, MEID.
    """
    queryset = Device.objects.select_related('current_owner', 'current_shipment').all()
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['current_status', 'demo_unit', 'refurbished', 'purchase_country', 'icloud_status']
    search_fields = ['imei', 'imei2', 'serial_number', 'meid', 'model', 'model_description']
    ordering_fields = ['created_at', 'updated_at', 'model', 'battery_health']

    @action(detail=False, methods=['get'])
    def scan(self, request):
        """Scans IMEI or Barcode and returns matching device details instantly."""
        query = request.query_params.get('code', '').strip()
        if not query:
            return Response({"error": "Missing 'code' query parameter"}, status=status.HTTP_400_BAD_REQUEST)

        device = Device.objects.filter(imei=query).first() or \
                 Device.objects.filter(imei2=query).first() or \
                 Device.objects.filter(serial_number=query).first() or \
                 Device.objects.filter(meid=query).first()

        if not device:
            return Response({"found": False, "message": "No device matches scanned code"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(device)
        return Response({"found": True, "device": serializer.data})

    def perform_create(self, serializer):
        device = serializer.save()
        user = self.request.user if self.request.user.is_authenticated else None

        if device.current_owner:
            DeviceAssignment.objects.create(
                device=device,
                employee=device.current_owner,
                is_active=True,
                notes="Assigned via Mobile App"
            )

        DeviceHistory.objects.create(
            device=device,
            user=user,
            action_type='CREATION',
            new_state=f"Device registered via Mobile App ({device.model} - IMEI: {device.imei})"
        )

    def perform_update(self, serializer):
        # Obtain clean pre-update state from DB directly before serializer writes changes
        db_device = Device.objects.only('current_owner', 'current_status').get(pk=serializer.instance.pk)
        old_owner = db_device.current_owner
        old_status = db_device.current_status
        user = self.request.user if (self.request and self.request.user and self.request.user.is_authenticated) else None

        device = serializer.save()

        # 1. Handle Owner Change & Assignment History Audit
        if old_owner != device.current_owner:
            old_owner_name = old_owner.username if old_owner else "None"

            # Deactivate previous active assignments
            DeviceAssignment.objects.filter(device=device, is_active=True).update(is_active=False)

            if device.current_owner:
                # Create new active assignment
                DeviceAssignment.objects.create(
                    device=device,
                    employee=device.current_owner,
                    is_active=True,
                    notes="Assigned via Mobile App"
                )
                # Sync seller on existing sales
                Sale.objects.filter(device=device).update(seller=device.current_owner)

                DeviceHistory.objects.create(
                    device=device,
                    user=user,
                    action_type='ASSIGNMENT',
                    old_state=f"Owner: {old_owner_name}",
                    new_state=f"Assigned to {device.current_owner.username}"
                )
            else:
                DeviceHistory.objects.create(
                    device=device,
                    user=user,
                    action_type='ASSIGNMENT',
                    old_state=f"Owner: {old_owner_name}",
                    new_state="Unassigned"
                )

        # 2. Handle Status Change & Activity Timeline Audit
        if old_status != device.current_status:
            old_status_display = dict(DeviceStatus.choices).get(old_status, old_status)
            new_status_display = device.get_current_status_display()

            # If moved away from UNDER_REPAIR, complete active repairs
            if old_status == DeviceStatus.UNDER_REPAIR and device.current_status != DeviceStatus.UNDER_REPAIR:
                try:
                    Repair.objects.filter(device=device, status=RepairStatus.IN_PROGRESS).update(
                        status=RepairStatus.COMPLETED,
                        returned_date=timezone.now().date()
                    )
                except Exception:
                    pass

            # If moved to SOLD, ensure sales record exists
            if device.current_status == DeviceStatus.SOLD:
                try:
                    seller = device.current_owner or user or User.objects.filter(is_superuser=True).first()
                    if seller:
                        existing_sale = Sale.objects.filter(device=device).first()
                        if not existing_sale:
                            buying = device.buying_price if device.buying_price is not None else Decimal('0.00')
                            selling = device.selling_price if device.selling_price is not None else buying
                            invoice_number = f"INV-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                            Sale.objects.create(
                                device=device,
                                customer=None,
                                seller=seller,
                                buying_price=buying,
                                selling_price=selling,
                                discount=Decimal('0.00'),
                                commission_amount=Decimal('0.00'),
                                invoice_number=invoice_number,
                                payment_status='PAID'
                            )
                except Exception:
                    pass

            DeviceHistory.objects.create(
                device=device,
                user=user,
                action_type='STATUS_UPDATE',
                old_state=old_status_display,
                new_state=new_status_display
            )

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('supplier').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['tracking_number', 'shipping_company']

    @action(detail=False, methods=['post'], url_path='create-batch')
    def create_batch(self, request):
        tracking_number = request.data.get('tracking_number', '').strip()
        supplier_name = request.data.get('supplier_name', '').strip()
        shipping_company = request.data.get('shipping_company', '').strip()
        product_name = request.data.get('product_name', '').strip()
        product_identifier = request.data.get('product_identifier', '').strip()
        variant = request.data.get('variant', '').strip()
        capacity = request.data.get('capacity', '').strip()
        color = request.data.get('color', '').strip()

        try:
            item_price = Decimal(str(request.data.get('item_price', '0.00') or '0.00'))
        except Exception:
            item_price = Decimal('0.00')
        try:
            shipment_fees = Decimal(str(request.data.get('shipment_fees', '0.00') or '0.00'))
        except Exception:
            shipment_fees = Decimal('0.00')
        try:
            discount = Decimal(str(request.data.get('discount', '0.00') or '0.00'))
        except Exception:
            discount = Decimal('0.00')

        if not tracking_number:
            return Response({"error": "Tracking Number is required."}, status=status.HTTP_400_BAD_REQUEST)

        shipment = Shipment.objects.filter(tracking_number=tracking_number).first()
        if shipment and not supplier_name:
            supplier = shipment.supplier
        elif supplier_name:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
        else:
            return Response({"error": "Supplier Name is required for new shipments."}, status=status.HTTP_400_BAD_REQUEST)

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
                        user=request.user if request.user.is_authenticated else None,
                        action_type='UPDATE',
                        new_state=f"Device updated via Shipment #{tracking_number} (Cost: BDT {total_buying_price})"
                    )
                    updated_count += 1
                else:
                    if identifier and (identifier.isdigit() and len(identifier) in [14, 15]):
                        imei_val = identifier
                        sn_val = ""
                    elif identifier:
                        imei_val = f"ID-{identifier}"
                        sn_val = identifier
                    else:
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
                        user=request.user if request.user.is_authenticated else None,
                        action_type='CREATION',
                        new_state=f"Device registered via Shipment #{tracking_number} (Cost: BDT {total_buying_price})"
                    )
                    created_count += 1

        if shipment_fees > 0:
            dev_count = shipment.devices.count()
            shipment.shipping_cost = shipment_fees * max(dev_count, 1)
            shipment.discount = discount
            shipment.save(update_fields=['shipping_cost', 'discount'])

        serializer = self.get_serializer(shipment)
        return Response({
            "shipment": serializer.data,
            "created_count": created_count,
            "updated_count": updated_count,
            "total_processed": created_count + updated_count
        }, status=status.HTTP_201_CREATED)

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'phone', 'facebook']

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('device', 'customer', 'seller').all()
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['invoice_number', 'device__imei', 'customer__name']

class RepairViewSet(viewsets.ModelViewSet):
    queryset = Repair.objects.select_related('device').all()
    serializer_class = RepairSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['device__imei', 'issue_description', 'repair_center']

class SickwViewSet(viewsets.ModelViewSet):
    queryset = SickwReport.objects.all()
    serializer_class = SickwReportSerializer
    permission_classes = [permissions.IsAuthenticated]

class SickwParseAPIView(APIView):
    """API endpoint to parse raw Sickw text payload without saving."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_text = request.data.get('raw_text', '')
        if not raw_text:
            return Response({"error": "raw_text payload field is required"}, status=status.HTTP_400_BAD_REQUEST)

        parsed = SickwParser.parse(raw_text)
        return Response({"raw_text": raw_text, "parsed": parsed})

class ExportDevicesCSVView(APIView):
    """Exports entire device inventory dataset to CSV format."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="inventory_devices.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'IMEI', 'IMEI2', 'MEID', 'Serial Number', 'Model', 'Model Description',
            'Capacity', 'Color', 'Variant', 'Status', 'Battery Health', 'Created Date'
        ])

        devices = Device.objects.all()
        for d in devices:
            writer.writerow([
                d.imei, d.imei2 or '', d.meid or '', d.serial_number or '',
                d.model, d.model_description or '', d.capacity or '', d.color or '',
                d.variant or '', d.get_current_status_display(), d.battery_health or '',
                d.created_at.strftime('%Y-%m-%d %H:%M')
            ])

        return response
