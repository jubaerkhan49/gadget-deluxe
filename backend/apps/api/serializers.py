from rest_framework import serializers
from apps.accounts.models import User
from apps.inventory.models import Device, DeviceAssignment, DeviceHistory, Photo, Note, CarrierInformation, Warranty
from apps.shipments.models import Shipment, Supplier
from apps.customers.models import Customer
from apps.sales.models import Sale
from apps.repairs.models import Repair
from apps.sickw.models import SickwReport

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'employee_code']

class DeviceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_current_status_display', read_only=True)
    current_owner_name = serializers.CharField(source='current_owner.username', read_only=True)

    class Meta:
        model = Device
        fields = '__all__'

class ShipmentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    devices_count = serializers.IntegerField(source='total_devices_count', read_only=True)
    unit_shipping_cost = serializers.DecimalField(source='unit_shipping_cost', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Shipment
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class SaleSerializer(serializers.ModelSerializer):
    device_imei = serializers.CharField(source='device.imei', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = ['profit', 'invoice_number']

class RepairSerializer(serializers.ModelSerializer):
    device_imei = serializers.CharField(source='device.imei', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Repair
        fields = '__all__'

class SickwReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SickwReport
        fields = '__all__'
