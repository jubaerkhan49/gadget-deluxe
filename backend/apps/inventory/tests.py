from django.test import TestCase
from apps.accounts.models import User
from apps.inventory.models import Device, DeviceStatus, DeviceAssignment

class InventoryModelTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='teststaff', password='Password123', role='EMPLOYEE')
        self.device = Device.objects.create(
            imei='352049102938475',
            model='iPhone 15 Pro',
            capacity='128GB',
            current_status=DeviceStatus.IN_STOCK
        )

    def test_device_creation(self):
        self.assertEqual(self.device.imei, '352049102938475')
        self.assertEqual(self.device.current_status, DeviceStatus.IN_STOCK)
        self.assertIn('iPhone 15 Pro', str(self.device))

    def test_device_assignment(self):
        assignment = DeviceAssignment.objects.create(
            device=self.device,
            employee=self.user,
            is_active=True
        )
        self.assertTrue(assignment.is_active)
        self.assertEqual(assignment.employee, self.user)
