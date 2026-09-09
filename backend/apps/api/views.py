import csv
from django.http import HttpResponse
from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend

from apps.inventory.models import Device, DeviceStatus
from apps.shipments.models import Shipment, Supplier
from apps.customers.models import Customer
from apps.sales.models import Sale
from apps.repairs.models import Repair
from apps.sickw.models import SickwReport
from apps.sickw.parser import SickwParser

from .serializers import (
    DeviceSerializer, ShipmentSerializer, SupplierSerializer,
    CustomerSerializer, SaleSerializer, RepairSerializer, SickwReportSerializer
)

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

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.select_related('supplier').all()
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['tracking_number', 'shipping_company']

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
