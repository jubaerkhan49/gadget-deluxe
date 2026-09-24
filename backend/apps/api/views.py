import csv
import datetime
import calendar
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
from apps.accounts.models import User, EmployeeApplication
from apps.inventory.models import Device, DeviceStatus, DeviceVariant, DeviceHistory, DeviceAssignment
from apps.shipments.models import Shipment, Supplier
from apps.customers.models import Customer
from apps.sales.models import Sale
from apps.repairs.models import Repair, RepairStatus
from apps.sickw.models import SickwReport
from apps.sickw.parser import SickwParser

from apps.orders.models import OtherGoodsOrder, TrackingStage, ProductCategory

from .serializers import (
    UserSerializer, DeviceSerializer, ShipmentSerializer, SupplierSerializer,
    CustomerSerializer, SaleSerializer, RepairSerializer, SickwReportSerializer,
    OtherGoodsOrderSerializer, PublicOrderTrackingSerializer, EmployeeApplicationSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    """API endpoint to list and create system users / employees for device assignment."""
    queryset = User.objects.filter(is_active=True).order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['username', 'first_name', 'last_name', 'email']

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Returns currently authenticated user profile and assigned device metrics."""
        user = request.user
        assigned_devices_count = user.assigned_devices.exclude(current_status=DeviceStatus.SOLD).count()
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'phone': user.phone,
            'assigned_devices_count': assigned_devices_count
        })

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        """
        Allows currently logged-in admin or employee to change their password.
        Expected body: { 'old_password': str, 'new_password': str }
        """
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response(
                {"error": "Both current password and new password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {"error": "New password must be at least 6 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({"success": True, "message": "Password changed successfully."})


class EmployeeApplicationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for employee recruitment applications.
    Public visitors can submit applications via POST.
    Admins/Managers can list, review, approve, or reject applications.
    """
    queryset = EmployeeApplication.objects.all().order_by('-created_at')
    serializer_class = EmployeeApplicationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['full_name', 'nickname', 'phone', 'email', 'nid_number']
    ordering_fields = ['created_at', 'status']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()
        full_name = data.get('full_name', '').strip()
        nid_number = data.get('nid_number', '').strip()
        address = data.get('address', '').strip()
        photo = data.get('photo', '')
        password = data.get('password', '')

        if not full_name or not phone or not email or not nid_number or not address or not password:
            return Response(
                {"error": "Please provide all required fields (Full Name, Phone, Email, NID Number, Address, and Password)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 6:
            return Response(
                {"error": "Password must be at least 6 characters long."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate photo size (must be strictly under 100KB: 102,400 bytes)
        if photo:
            if len(photo) > 145000:
                return Response(
                    {"error": "Photo exceeds the maximum allowed size of 100KB. Please upload a smaller compressed image under 100KB."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check if email is already registered as an active user
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"error": "An employee account with this email address is already registered in the system."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if there is already an unreviewed pending application
        if EmployeeApplication.objects.filter(email__iexact=email, status=EmployeeApplication.Status.PENDING).exists():
            return Response(
                {"error": "You already have an application under review. Our team will verify and approve your request shortly."},
                status=status.HTTP_400_BAD_REQUEST
            )

        application = EmployeeApplication.objects.create(
            full_name=full_name,
            nickname=data.get('nickname', '').strip(),
            phone=phone,
            email=email,
            nid_number=nid_number,
            address=address,
            photo=photo,
            password=password,
            status=EmployeeApplication.Status.PENDING
        )

        return Response({
            "success": True,
            "message": "Your employee application has been submitted successfully! It is pending administrator review.",
            "application_id": application.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approves application and creates an active Employee User account."""
        application = self.get_object()

        if application.status == EmployeeApplication.Status.APPROVED:
            return Response({"error": "This application has already been approved."}, status=status.HTTP_400_BAD_REQUEST)

        # Determine unique username
        base_username = (application.nickname or application.full_name.split()[0] or application.email.split('@')[0]).lower()
        base_username = re.sub(r'[^a-z0-9_]', '', base_username)
        if not base_username:
            base_username = 'employee'

        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        first_name = application.full_name
        last_name = ''
        name_parts = application.full_name.split(' ', 1)
        if len(name_parts) == 2:
            first_name, last_name = name_parts

        user = User.objects.create(
            username=username,
            email=application.email,
            first_name=first_name,
            last_name=last_name,
            phone=application.phone,
            role=User.Role.EMPLOYEE,
            notes=f"Approved Employee Application #{application.id}\nNID: {application.nid_number}\nAddress: {application.address}",
            is_active=True
        )
        user.set_password(application.password)
        user.save()

        application.status = EmployeeApplication.Status.APPROVED
        application.reviewed_by = request.user
        application.created_user = user
        application.review_notes = request.data.get('notes', 'Approved by administrator.')
        application.save()

        return Response({
            "success": True,
            "message": f"Employee {user.get_full_name() or user.username} approved! Username: {user.username}",
            "user": UserSerializer(user).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejects employee join application."""
        application = self.get_object()
        application.status = EmployeeApplication.Status.REJECTED
        application.reviewed_by = request.user
        application.review_notes = request.data.get('notes', 'Application rejected by administrator.')
        application.save()

        return Response({
            "success": True,
            "message": "Application has been marked as rejected."
        })

class DeviceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing device inventory.
    Filter by status, search by IMEI, IMEI2, Serial, Model, MEID.
    Employees are strictly restricted to devices in their own custody.
    """
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['current_status', 'current_shipment', 'is_b2b', 'b2b_shop_name', 'b2b_status', 'b2b_has_issues', 'demo_unit', 'refurbished', 'purchase_country', 'icloud_status']
    search_fields = ['imei', 'imei2', 'serial_number', 'meid', 'model', 'model_description', 'b2b_shop_name']
    ordering_fields = ['created_at', 'updated_at', 'model', 'battery_health']

    def get_queryset(self):
        user = self.request.user
        qs = Device.objects.select_related('current_owner', 'current_shipment').all()
        # If regular employee, only show active in-stock devices assigned to them!
        if user.is_authenticated and user.role == User.Role.EMPLOYEE and not user.is_superuser and user.username not in ['jubaer', 'admin']:
            return qs.filter(current_owner=user).exclude(current_status=DeviceStatus.SOLD)
        return qs

    @action(detail=False, methods=['get'])
    def scan(self, request):
        """Scans IMEI or Barcode and returns matching device details instantly."""
        query = request.query_params.get('code', '').strip()
        if not query:
            return Response({"error": "Missing 'code' query parameter"}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset()
        device = qs.filter(imei=query).first() or \
                 qs.filter(imei2=query).first() or \
                 qs.filter(serial_number=query).first() or \
                 qs.filter(meid=query).first()

        if not device:
            return Response({"found": False, "message": "No device matches scanned code in your inventory"}, status=status.HTTP_404_NOT_FOUND)

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

        explicit_status_requested = 'current_status' in self.request.data
        explicit_owner_requested = 'current_owner' in self.request.data

        device = serializer.save()

        # 1. Handle Owner Change & Assignment History Audit
        owner_changed = (old_owner != device.current_owner)
        has_active_assignment = (
            device.current_owner and DeviceAssignment.objects.filter(device=device, employee=device.current_owner, is_active=True).exists()
        )

        if owner_changed or (device.current_owner and not has_active_assignment):
            old_owner_name = old_owner.username if old_owner else "None"

            # Deactivate previous active assignments for other owners
            if device.current_owner:
                DeviceAssignment.objects.filter(device=device, is_active=True).exclude(employee=device.current_owner).update(is_active=False)
                if not has_active_assignment:
                    # Create new active assignment ONLY if not already assigned
                    DeviceAssignment.objects.create(
                        device=device,
                        employee=device.current_owner,
                        is_active=True,
                        notes="Assigned via Web/Mobile App"
                    )
                # Sync seller on existing sales
                Sale.objects.filter(device=device).update(seller=device.current_owner)

                if owner_changed:
                    DeviceHistory.objects.create(
                        device=device,
                        user=user,
                        action_type='ASSIGNMENT',
                        old_state=f"Owner: {old_owner_name}",
                        new_state=f"Assigned to {device.current_owner.username}"
                    )
            else:
                # Unassign all
                DeviceAssignment.objects.filter(device=device, is_active=True).update(is_active=False)
                DeviceHistory.objects.create(
                    device=device,
                    user=user,
                    action_type='ASSIGNMENT',
                    old_state=f"Owner: {old_owner_name}",
                    new_state="Unassigned"
                )

        # 2. Handle Status Change & Activity Timeline Audit
        if explicit_status_requested or old_status != device.current_status:
            old_status_display = dict(DeviceStatus.choices).get(old_status, old_status)
            new_status_display = device.get_current_status_display()

            # If moved away from SOLD (e.g. Refund / Return back to In Stock)
            if old_status == DeviceStatus.SOLD and device.current_status != DeviceStatus.SOLD:
                try:
                    deleted_invoices = list(Sale.objects.filter(device=device).values_list('invoice_number', flat=True))
                    Sale.objects.filter(device=device).delete()
                    invoices_str = f" (Invoice: {', '.join(deleted_invoices)})" if deleted_invoices else ""
                    DeviceHistory.objects.create(
                        device=device,
                        user=user,
                        action_type='STATUS_UPDATE',
                        old_state=f"Sold{invoices_str}",
                        new_state=f"Returned / Refunded to {new_status_display}"
                    )
                except Exception:
                    pass
            else:
                # Always record status update audit event first
                DeviceHistory.objects.create(
                    device=device,
                    user=user,
                    action_type='STATUS_UPDATE',
                    old_state=old_status_display,
                    new_state=new_status_display
                )

            # If moved away from UNDER_REPAIR, complete active repairs
            if old_status == DeviceStatus.UNDER_REPAIR and device.current_status != DeviceStatus.UNDER_REPAIR:
                try:
                    Repair.objects.filter(
                        device=device,
                        status__in=[RepairStatus.IN_PROGRESS, RepairStatus.SENT_TO_CHINA]
                    ).update(
                        status=RepairStatus.COMPLETED,
                        returned_date=timezone.localdate()
                    )
                except Exception:
                    pass

            # If moved TO UNDER_REPAIR, automatically ensure active Repair record exists
            if device.current_status == DeviceStatus.UNDER_REPAIR:
                try:
                    active_repair = Repair.objects.filter(
                        device=device,
                        status__in=[RepairStatus.IN_PROGRESS, RepairStatus.SENT_TO_CHINA]
                    ).first()
                    if not active_repair:
                        Repair.objects.create(
                            device=device,
                            issue_description=device.notes or "Hardware fault / servicing requested from Inventory",
                            sent_date=timezone.localdate(),
                            repair_center="In-House / China Service",
                            status=RepairStatus.IN_PROGRESS,
                            repair_cost=Decimal('0.00'),
                            timeline_log=[{
                                'timestamp': timezone.now().isoformat(),
                                'text': f'Device marked Under Repair by {user.username if user else "System"}',
                                'author': user.username if user else 'System'
                            }]
                        )
                except Exception:
                    pass

        # 3. Handle Selling Price & Sales Record Management
        has_selling_price_in_req = 'selling_price' in self.request.data
        selling_price_raw = self.request.data.get('selling_price')

        if device.current_status == DeviceStatus.SOLD:
            try:
                seller = device.current_owner or user or User.objects.filter(is_superuser=True).first()
                if seller:
                    existing_sale = Sale.objects.filter(device=device).first()
                    buying = device.buying_price if device.buying_price is not None else Decimal('0.00')

                    if selling_price_raw is not None and str(selling_price_raw).strip() != '':
                        sp_dec = Decimal(str(selling_price_raw))
                    elif existing_sale and existing_sale.selling_price is not None:
                        sp_dec = existing_sale.selling_price
                    elif device.buying_price is not None:
                        sp_dec = device.buying_price
                    else:
                        sp_dec = Decimal('0.00')

                    if not existing_sale:
                        invoice_number = f"INV-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                        Sale.objects.create(
                            device=device,
                            customer=None,
                            seller=seller,
                            buying_price=buying,
                            selling_price=sp_dec,
                            discount=Decimal('0.00'),
                            commission_amount=Decimal('0.00'),
                            invoice_number=invoice_number,
                            payment_status='PAID'
                        )
                        DeviceHistory.objects.create(
                            device=device,
                            user=user,
                            action_type='STATUS_UPDATE',
                            new_state=f"Marked as Sold (Invoice: {invoice_number}, Price: BDT {sp_dec})"
                        )
                    else:
                        old_sp = existing_sale.selling_price
                        if selling_price_raw is not None and str(selling_price_raw).strip() != '':
                            existing_sale.selling_price = sp_dec
                        existing_sale.seller = seller
                        existing_sale.save()
                        if old_sp != existing_sale.selling_price:
                            DeviceHistory.objects.create(
                                device=device,
                                user=user,
                                action_type='STATUS_UPDATE',
                                new_state=f"Selling price updated to BDT {existing_sale.selling_price} (Invoice: {existing_sale.invoice_number})"
                            )
            except Exception:
                pass

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('supplier').prefetch_related('devices').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['tracking_number', 'shipping_company']

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        supplier_name = request.data.get('supplier_name')
        if supplier_name and str(supplier_name).strip():
            supplier, _ = Supplier.objects.get_or_create(name=str(supplier_name).strip())
            instance.supplier = supplier
            instance.save()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

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
    serializer_class = RepairSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['device__imei', 'issue_description', 'repair_center']

    def get_queryset(self):
        # Auto-sync: Ensure any device currently marked as UNDER_REPAIR has an active repair record
        try:
            under_repair_devices = Device.objects.filter(current_status=DeviceStatus.UNDER_REPAIR)
            for dev in under_repair_devices:
                has_active = Repair.objects.filter(
                    device=dev,
                    status__in=[RepairStatus.IN_PROGRESS, RepairStatus.SENT_TO_CHINA]
                ).exists()
                if not has_active:
                    Repair.objects.create(
                        device=dev,
                        issue_description=dev.notes or "Hardware fault / servicing requested from Inventory",
                        sent_date=timezone.localdate(),
                        repair_center="In-House / China Service",
                        status=RepairStatus.IN_PROGRESS,
                        repair_cost=Decimal('0.00'),
                        timeline_log=[{
                            'timestamp': timezone.now().isoformat(),
                            'text': 'Auto-synced active repair from Inventory status',
                            'author': 'System'
                        }]
                    )
        except Exception:
            pass

        return Repair.objects.select_related('device').annotate(
            status_order=models.Case(
                models.When(status=RepairStatus.IN_PROGRESS, then=models.Value(1)),
                models.When(status=RepairStatus.SENT_TO_CHINA, then=models.Value(2)),
                models.When(status=RepairStatus.UNREPAIRABLE, then=models.Value(3)),
                models.When(status=RepairStatus.COMPLETED, then=models.Value(4)),
                default=models.Value(5),
                output_field=models.IntegerField()
            )
        ).order_by('status_order', '-sent_date', '-created_at')

    def perform_create(self, serializer):
        repair = serializer.save()
        if repair.device and repair.status in [RepairStatus.IN_PROGRESS, RepairStatus.SENT_TO_CHINA]:
            repair.device.current_status = DeviceStatus.UNDER_REPAIR
            repair.device.save()

    def perform_update(self, serializer):
        repair = serializer.save()
        if repair.device:
            if repair.status == RepairStatus.COMPLETED and repair.device.current_status == DeviceStatus.UNDER_REPAIR:
                repair.device.current_status = DeviceStatus.IN_STOCK
                repair.device.save()
            elif repair.status in [RepairStatus.IN_PROGRESS, RepairStatus.SENT_TO_CHINA]:
                repair.device.current_status = DeviceStatus.UNDER_REPAIR
                repair.device.save()

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
    """Exports device inventory dataset to CSV format."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        status_filter = request.GET.get('status')
        filename = "archived_sold_devices.csv" if status_filter == 'SOLD' else "inventory_devices.csv"

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'IMEI', 'IMEI2', 'MEID', 'Serial Number', 'Model', 'Model Description',
            'Capacity', 'Color', 'Variant', 'Status', 'Battery Health', 'Assigned To',
            'Buying Price', 'Selling Price', 'Created Date'
        ])

        devices = Device.objects.select_related('current_owner', 'current_shipment').all()
        if status_filter:
            devices = devices.filter(current_status=status_filter)

        for d in devices:
            writer.writerow([
                d.imei,
                d.imei2 or '',
                d.meid or '',
                d.serial_number or '',
                d.model or '',
                d.model_description or '',
                d.capacity or '',
                d.color or '',
                d.variant or '',
                d.get_current_status_display() if hasattr(d, 'get_current_status_display') else d.current_status,
                d.battery_health or '',
                d.current_owner.username if d.current_owner else 'Unassigned',
                str(d.buying_price or ''),
                str(d.selling_price or ''),
                d.created_at.strftime('%Y-%m-%d %H:%M') if d.created_at else ''
            ])

        return response


class DashboardStatsAPIView(APIView):
    """API endpoint returning operational dashboard metrics in real-time."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # If regular employee, return ONLY their personal assigned custody metrics!
        if user.is_authenticated and user.role == User.Role.EMPLOYEE and not user.is_superuser and user.username not in ['jubaer', 'admin']:
            my_devices = Device.objects.filter(current_owner=user)
            my_assigned_count = my_devices.exclude(current_status=DeviceStatus.SOLD).count()
            return Response({
                'user_role': 'EMPLOYEE',
                'is_admin': False,
                'username': user.username,
                'my_assigned_count': my_assigned_count,
                'total_devices': my_devices.count(),
                'in_stock': my_devices.filter(current_status=DeviceStatus.IN_STOCK).count(),
                'under_repair': my_devices.filter(current_status=DeviceStatus.UNDER_REPAIR).count(),
                'sold': my_devices.filter(current_status=DeviceStatus.SOLD).count(),
                'waiting_shipment': 0,
                'returned': 0,
                'total_assets': 0,
                'today_sales': 0,
                'total_sales': 0,
                'today_profit': 0,
                'total_profit': 0,
                'monthly_profit': 0,
                'others_owned': 0,
                'pending_applications_count': 0,
            })

        local_today = timezone.localdate()
        month_start = local_today.replace(day=1)

        total_devices = Device.objects.count()
        in_stock_count = Device.objects.filter(current_status=DeviceStatus.IN_STOCK).count()
        sold_count = Device.objects.filter(current_status=DeviceStatus.SOLD).count()
        waiting_shipment_count = Device.objects.filter(current_status=DeviceStatus.WAITING_SHIPMENT).count()
        repair_count = Device.objects.filter(current_status=DeviceStatus.UNDER_REPAIR).count()
        returned_count = Device.objects.filter(current_status=DeviceStatus.RETURNED).count()

        total_assets = Device.objects.exclude(current_status=DeviceStatus.SOLD).aggregate(total=models.Sum('buying_price'))['total'] or Decimal('0.00')

        total_sales_qs = Sale.objects.all()
        total_sales = total_sales_qs.aggregate(total=models.Sum('selling_price'))['total'] or Decimal('0.00')
        total_profit = total_sales_qs.aggregate(total=models.Sum('profit'))['total'] or Decimal('0.00')

        today_sales_qs = Sale.objects.filter(sale_date__date=local_today)
        today_sales = today_sales_qs.aggregate(total=models.Sum('selling_price'))['total'] or Decimal('0.00')
        today_profit = today_sales_qs.aggregate(total=models.Sum('profit'))['total'] or Decimal('0.00')

        monthly_sales_qs = Sale.objects.filter(sale_date__date__gte=month_start)
        monthly_profit = monthly_sales_qs.aggregate(total=models.Sum('profit'))['total'] or Decimal('0.00')

        # Devices currently held by other team owners (excluding store owner jubaer and admin)
        others_owned_count = Device.objects.filter(
            current_owner__isnull=False
        ).exclude(
            current_owner__username__in=['jubaer', 'admin']
        ).exclude(
            current_status=DeviceStatus.SOLD
        ).count()

        my_assigned_count = 0
        if request.user.is_authenticated:
            my_assigned_count = Device.objects.filter(
                current_owner=request.user
            ).exclude(
                current_status=DeviceStatus.SOLD
            ).count()

        pending_applications_count = 0
        if request.user.is_authenticated and (request.user.role in [User.Role.ADMIN, User.Role.MANAGER] or request.user.is_superuser):
            pending_applications_count = EmployeeApplication.objects.filter(
                status=EmployeeApplication.Status.PENDING
            ).count()

        return Response({
            'user_role': request.user.role if request.user.is_authenticated else 'ADMIN',
            'is_admin': True,
            'total_devices': total_devices,
            'in_stock': in_stock_count,
            'sold': sold_count,
            'waiting_shipment': waiting_shipment_count,
            'under_repair': repair_count,
            'returned': returned_count,
            'total_assets': float(total_assets),
            'today_sales': float(today_sales),
            'total_sales': float(total_sales),
            'today_profit': float(today_profit),
            'total_profit': float(total_profit),
            'monthly_profit': float(monthly_profit),
            'others_owned': others_owned_count,
            'my_assigned_count': my_assigned_count,
            'pending_applications_count': pending_applications_count,
            'username': request.user.username if request.user.is_authenticated else ''
        })


class AnalyticsStatsAPIView(APIView):
    """
    API endpoint returning comprehensive monthly business analytics,
    best seller performance (consistency, speed to sell, profit),
    monthly investment (devices * buying price), repair costs, and shipping logistics expenses.
    Supports optional ?year=YYYY&month=M query parameters.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        local_today = timezone.localdate()

        try:
            year = int(request.query_params.get('year', local_today.year))
            month = int(request.query_params.get('month', local_today.month))
            if not (1 <= month <= 12):
                month = local_today.month
        except (ValueError, TypeError):
            year = local_today.year
            month = local_today.month

        # Month boundaries
        last_day = calendar.monthrange(year, month)[1]
        start_date = datetime.date(year, month, 1)
        end_date = datetime.date(year, month, last_day)

        start_dt = timezone.make_aware(datetime.datetime.combine(start_date, datetime.time.min))
        end_dt = timezone.make_aware(datetime.datetime.combine(end_date, datetime.time.max))

        # 1. Monthly Sales & Profit
        sales_qs = Sale.objects.filter(sale_date__gte=start_dt, sale_date__lte=end_dt).select_related('device', 'seller')
        total_sales_count = sales_qs.count()
        total_revenue = sales_qs.aggregate(total=models.Sum('selling_price'))['total'] or Decimal('0.00')
        retail_profit = sales_qs.aggregate(total=models.Sum('profit'))['total'] or Decimal('0.00')

        # 2. Total Investment this month: total self-invested devices added/registered this month * buying price (excluding B2B)
        devices_invested_qs = Device.objects.filter(is_b2b=False, created_at__gte=start_dt, created_at__lte=end_dt)
        total_devices_invested = devices_invested_qs.count()
        total_investment = devices_invested_qs.aggregate(total=models.Sum('buying_price'))['total'] or Decimal('0.00')
        avg_investment_per_device = (
            (total_investment / Decimal(str(total_devices_invested))).quantize(Decimal('0.01'))
            if total_devices_invested > 0 else Decimal('0.00')
        )

        # B2B Client Analytics this month
        b2b_qs = Device.objects.filter(is_b2b=True, created_at__gte=start_dt, created_at__lte=end_dt)
        b2b_total_count = b2b_qs.count()
        b2b_delivered_count = b2b_qs.filter(b2b_status='DELIVERED').count()
        b2b_pending_count = b2b_qs.filter(b2b_status='PENDING_DELIVERY').count()
        b2b_repair_count = b2b_qs.filter(b2b_status='UNDER_REPAIR').count()
        b2b_total_profit = sum([float(d.b2b_profit) for d in b2b_qs if d.b2b_profit is not None])
        b2b_profit_dec = Decimal(str(round(b2b_total_profit, 2)))

        # Silently add B2B trade profits into overall business Total Profit
        total_profit = retail_profit + b2b_profit_dec

        # 3. Monthly Repair Costs
        repairs_qs = Repair.objects.filter(
            models.Q(sent_date__gte=start_date, sent_date__lte=end_date) |
            models.Q(created_at__gte=start_dt, created_at__lte=end_dt)
        )
        total_repair_cost = repairs_qs.aggregate(total=models.Sum('repair_cost'))['total'] or Decimal('0.00')
        repair_devices_count = repairs_qs.values('device_id').distinct().count()
        repairs_in_progress = repairs_qs.filter(status=RepairStatus.IN_PROGRESS).count()
        repairs_completed = repairs_qs.filter(status=RepairStatus.COMPLETED).count()

        # 4. Monthly Shipping Costs
        shipments_qs = Shipment.objects.filter(
            models.Q(receive_date__gte=start_date, receive_date__lte=end_date) |
            (models.Q(receive_date__isnull=True) & models.Q(created_at__gte=start_dt, created_at__lte=end_dt))
        ).prefetch_related('devices')
        total_shipping_cost = sum([s.net_shipping_cost for s in shipments_qs]) if shipments_qs else Decimal('0.00')
        shipment_batches_count = shipments_qs.count()
        shipment_devices_count = sum([s.total_devices_count for s in shipments_qs]) if shipments_qs else 0

        # 5. Net Profit (Real Business ROI)
        net_profit = total_profit - total_repair_cost - total_shipping_cost
        roi_percentage = (
            round((float(net_profit) / float(total_investment) * 100), 1)
            if total_investment > Decimal('0.00') else 0.0
        )
        profit_margin = (
            round((float(total_profit) / float(total_revenue) * 100), 1)
            if total_revenue > Decimal('0.00') else 0.0
        )

        # 6. Best Seller Ranking & Team Analytics
        # Who is consistent, takes less time after assigning, generates most profit
        seller_map = {}
        for sale in sales_qs:
            seller = sale.seller
            if not seller:
                continue

            sid = seller.id
            if sid not in seller_map:
                full_name = f"{seller.first_name} {seller.last_name}".strip()
                seller_map[sid] = {
                    'seller_id': sid,
                    'username': seller.username,
                    'display_name': full_name if full_name else seller.username,
                    'units_sold': 0,
                    'total_revenue': Decimal('0.00'),
                    'total_profit': Decimal('0.00'),
                    'sale_days': set(),
                    'turnaround_days_list': []
                }

            seller_map[sid]['units_sold'] += 1
            seller_map[sid]['total_revenue'] += (sale.selling_price or Decimal('0.00'))
            seller_map[sid]['total_profit'] += (sale.profit or Decimal('0.00'))
            if sale.sale_date:
                seller_map[sid]['sale_days'].add(sale.sale_date.date())

            # Calculate turnaround time: days from assignment (or device creation) to sale
            if sale.device:
                # Look for assignment to this seller prior to sale
                assign = sale.device.assignments.filter(
                    employee=seller,
                    assigned_date__lte=sale.sale_date
                ).order_by('-assigned_date').first()

                ref_date = assign.assigned_date if assign else sale.device.created_at
                if ref_date and sale.sale_date:
                    delta_days = (sale.sale_date - ref_date).total_seconds() / 86400.0
                    seller_map[sid]['turnaround_days_list'].append(max(0.0, delta_days))

        sellers_list = []
        for sid, sdata in seller_map.items():
            turnarounds = sdata['turnaround_days_list']
            avg_turnaround = round(sum(turnarounds) / len(turnarounds), 1) if turnarounds else 0.0
            active_days_count = len(sdata['sale_days'])

            # Consistency score: based on spread of active sales days
            consistency_score = min(100, int((active_days_count / max(1, last_day)) * 100 * 2.5) + (sdata['units_sold'] * 4))

            sellers_list.append({
                'seller_id': sid,
                'username': sdata['username'],
                'display_name': sdata['display_name'],
                'units_sold': sdata['units_sold'],
                'total_revenue': float(sdata['total_revenue']),
                'total_profit': float(sdata['total_profit']),
                'avg_turnaround_days': avg_turnaround,
                'active_sale_days': active_days_count,
                'consistency_score': consistency_score
            })

        # Rank by total_profit descending
        sellers_list.sort(key=lambda x: x['total_profit'], reverse=True)
        for idx, seller in enumerate(sellers_list):
            seller['profit_rank'] = idx + 1

        best_seller = sellers_list[0] if sellers_list else None

        # 7. Top Selling Device Models this month
        model_map = {}
        for sale in sales_qs:
            model_name = (sale.device.model if sale.device and sale.device.model else "Unknown Model").strip()
            if model_name not in model_map:
                model_map[model_name] = {
                    'model': model_name,
                    'units_sold': 0,
                    'total_revenue': Decimal('0.00'),
                    'total_profit': Decimal('0.00')
                }
            model_map[model_name]['units_sold'] += 1
            model_map[model_name]['total_revenue'] += (sale.selling_price or Decimal('0.00'))
            model_map[model_name]['total_profit'] += (sale.profit or Decimal('0.00'))

        top_models = sorted(
            [
                {
                    'model': m['model'],
                    'units_sold': m['units_sold'],
                    'total_revenue': float(m['total_revenue']),
                    'total_profit': float(m['total_profit'])
                }
                for m in model_map.values()
            ],
            key=lambda x: x['units_sold'],
            reverse=True
        )[:6]

        # 8. Daily Sales & Profit Timeline for Chart
        daily_trends = []
        for d in range(1, last_day + 1):
            cur_d = datetime.date(year, month, d)
            if cur_d > local_today and year == local_today.year and month == local_today.month:
                break
            day_sales = [s for s in sales_qs if s.sale_date and s.sale_date.date() == cur_d]
            day_rev = sum([s.selling_price or Decimal('0.00') for s in day_sales])
            day_prof = sum([s.profit or Decimal('0.00') for s in day_sales])
            daily_trends.append({
                'date': cur_d.strftime('%b %d'),
                'day': d,
                'sales_count': len(day_sales),
                'revenue': float(day_rev),
                'profit': float(day_prof)
            })

        return Response({
            'selected_year': year,
            'selected_month': month,
            'month_label': datetime.date(year, month, 1).strftime('%B %Y'),
            'summary': {
                'total_profit': float(total_profit),
                'net_profit': float(net_profit),
                'total_revenue': float(total_revenue),
                'total_sales_count': total_sales_count,
                'profit_margin': profit_margin,
                'roi_percentage': roi_percentage,
                'total_investment': float(total_investment),
                'total_devices_invested': total_devices_invested,
                'avg_investment_per_device': float(avg_investment_per_device),
                'total_repair_cost': float(total_repair_cost),
                'repair_devices_count': repair_devices_count,
                'repairs_in_progress': repairs_in_progress,
                'repairs_completed': repairs_completed,
                'total_shipping_cost': float(total_shipping_cost),
                'shipment_batches_count': shipment_batches_count,
                'shipment_devices_count': shipment_devices_count,
                'b2b_total_count': b2b_total_count,
                'b2b_delivered_count': b2b_delivered_count,
                'b2b_pending_count': b2b_pending_count,
                'b2b_repair_count': b2b_repair_count,
                'b2b_total_profit': float(b2b_total_profit)
            },
            'best_seller': best_seller,
            'sellers_ranking': sellers_list,
            'top_models': top_models,
            'daily_trends': daily_trends
        })


class OtherGoodsOrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Other Goods custom orders (Laptops, AirPods, Gadgets, Cosmetics, etc.)
    with an 8-stage tracking pipeline, payment tracking, and due calculation.
    """
    queryset = OtherGoodsOrder.objects.all()
    serializer_class = OtherGoodsOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tracking_status', 'category', 'payment_method']
    search_fields = ['order_id', 'customer_name', 'customer_phone', 'product_name', 'tracking_notes', 'product_specs', 'transaction_id']
    ordering_fields = ['order_date', 'created_at', 'updated_at', 'buying_price', 'selling_price', 'product_price', 'payment_amount', 'shipping_cost']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        order = serializer.save()
        if not order.timeline_events:
            order.timeline_events = [{
                'stage': order.tracking_status,
                'stage_display': order.get_tracking_status_display(),
                'timestamp': timezone.now().isoformat(),
                'note': order.tracking_notes or 'Order registered into system'
            }]
            order.save(update_fields=['timeline_events'])

    def perform_update(self, serializer):
        old_order = OtherGoodsOrder.objects.get(pk=serializer.instance.pk)
        old_stage = old_order.tracking_status
        old_payment = old_order.payment_amount
        old_shipping = old_order.shipping_cost
        old_selling = old_order.selling_price

        order = serializer.save()

        # Check if timeline event should be added
        events = list(order.timeline_events or [])
        stage_changed = (old_stage != order.tracking_status)
        payment_changed = (old_payment != order.payment_amount)
        shipping_changed = (old_shipping != order.shipping_cost)
        selling_changed = (old_selling != order.selling_price)

        if stage_changed or payment_changed or shipping_changed or selling_changed:
            note_parts = []
            if stage_changed:
                note_parts.append(f"Stage changed to {order.get_tracking_status_display()}")
            if payment_changed:
                pm_text = f" via {order.get_payment_method_display()}" if order.payment_method else ""
                trx_text = f" (TrxID: {order.transaction_id})" if order.transaction_id else ""
                note_parts.append(f"Payment updated to BDT {order.payment_amount}{pm_text}{trx_text} (Due: BDT {order.due_amount})")
            if shipping_changed:
                note_parts.append(f"Shipping cost updated to BDT {order.shipping_cost}")
            if selling_changed:
                note_parts.append(f"Selling price updated to BDT {order.selling_price}")
            if order.tracking_notes and order.tracking_notes != old_order.tracking_notes:
                note_parts.append(f"Note: {order.tracking_notes}")

            events.append({
                'stage': order.tracking_status,
                'stage_display': order.get_tracking_status_display(),
                'timestamp': timezone.now().isoformat(),
                'note': " | ".join(note_parts) if note_parts else (order.tracking_notes or "Order updated")
            })
            order.timeline_events = events
            order.save(update_fields=['timeline_events'])


class PublicOrderTrackingAPIView(APIView):
    """
    Public unauthenticated API endpoint for customers to track their order status,
    view the 8-stage progress timeline, shipping details, and paid vs due amounts.
    Accepts ?query= or ?order_id= or ?phone=.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = (
            request.query_params.get('query') or
            request.query_params.get('order_id') or
            request.query_params.get('phone') or
            request.query_params.get('q') or ''
        ).strip()

        if not query:
            return Response({
                "found": False,
                "message": "Please provide an Order ID (e.g. OG-2026-XXXX) or Customer Phone Number."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Match exact or prefix Order ID
        orders = OtherGoodsOrder.objects.filter(
            models.Q(order_id__iexact=query) |
            models.Q(order_id__icontains=query) |
            models.Q(customer_phone__iexact=query) |
            models.Q(customer_phone__icontains=query)
        ).order_by('-created_at')

        if not orders.exists():
            return Response({
                "found": False,
                "message": f"No order found matching '{query}'. Please check your Order ID or Phone Number."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = PublicOrderTrackingSerializer(orders, many=True)
        return Response({
            "found": True,
            "count": orders.count(),
            "orders": serializer.data,
            "order": serializer.data[0]
        }, status=status.HTTP_200_OK)



