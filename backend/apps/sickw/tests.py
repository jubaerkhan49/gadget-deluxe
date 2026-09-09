from django.test import TestCase
from apps.sickw.parser import SickwParser

class SickwParserTestCase(TestCase):
    def test_sickw_parser_full_output(self):
        sample_text = """
Model Description: iPhone 15 Pro Max 256GB Natural Titanium
Model: iPhone 15 Pro Max
IMEI: 352049102938475
IMEI2: 352049102938476
MEID: 35204910293847
Serial Number: F2LDK948H1
Estimated Purchase Date: 2024-01-15
Warranty Status: AppleCare+
iCloud Lock: OFF
Demo Unit: No
Loaner Device: No
Replaced Device: No
Replacement Device: No
Refurbished Device: No
Purchase Country: United States
Locked Carrier: Unlocked
Sim-Lock Status: Unlocked
        """
        parsed = SickwParser.parse(sample_text)
        self.assertEqual(parsed.get('imei'), '352049102938475')
        self.assertEqual(parsed.get('model'), 'iPhone 15 Pro Max')
        self.assertEqual(parsed.get('serial_number'), 'F2LDK948H1')
        self.assertEqual(parsed.get('icloud_lock'), 'OFF')
        self.assertEqual(parsed.get('sim_lock_status'), 'Unlocked')

    def test_sickw_parser_missing_fields_no_crash(self):
        sample_text = "IMEI: 990001122334455\nRandom Line without colon"
        parsed = SickwParser.parse(sample_text)
        self.assertEqual(parsed.get('imei'), '990001122334455')
        self.assertNotIn('random', parsed)
