import re
from typing import Dict, Any

class SickwParser:
    """Robust regex & key-value parser for copy-pasted Sickw API & raw check reports."""
    
    KEY_MAPPINGS = {
        'model description': 'model_description',
        'model': 'model',
        'imei': 'imei',
        'imei1': 'imei',
        'imei2': 'imei2',
        'meid': 'meid',
        'serial number': 'serial_number',
        'serial': 'serial_number',
        'estimated purchase date': 'estimated_purchase_date',
        'purchase date': 'estimated_purchase_date',
        'warranty status': 'warranty_status',
        'warranty': 'warranty_status',
        'icloud lock': 'icloud_lock',
        'icloud status': 'icloud_lock',
        'icloud': 'icloud_lock',
        'capacity': 'capacity',
        'storage': 'capacity',
        'demo unit': 'demo_unit',
        'loaner device': 'loaner_device',
        'replaced device': 'replaced_device',
        'replacement device': 'replacement_device',
        'refurbished device': 'refurbished_device',
        'refurbished': 'refurbished_device',
        'purchase country': 'purchase_country',
        'country': 'purchase_country',
        'locked carrier': 'locked_carrier',
        'carrier': 'locked_carrier',
        'sim-lock status': 'sim_lock_status',
        'sim lock status': 'sim_lock_status',
        'sim-lock': 'sim_lock_status',
        'sim lock': 'sim_lock_status',
    }

    @classmethod
    def parse(cls, raw_text: str) -> Dict[str, Any]:
        """Parses raw Sickw report text line by line safely into key-value pairs."""
        parsed = {}
        if not raw_text or not raw_text.strip():
            return parsed

        lines = raw_text.strip().splitlines()
        for line in lines:
            line = line.strip()
            if not line or ':' not in line:
                continue

            parts = line.split(':', 1)
            raw_key = parts[0].strip().lower()
            val = parts[1].strip()

            # Clean raw_key (remove bullet points, numbers or special chars)
            clean_key = re.sub(r'^[^\w]+', '', raw_key)
            
            if clean_key in cls.KEY_MAPPINGS:
                field_name = cls.KEY_MAPPINGS[clean_key]
                if field_name not in parsed:  # Keep first match
                    parsed[field_name] = val

        # Fallback: Extract capacity from model_description if capacity is not explicitly present
        if 'capacity' not in parsed and 'model_description' in parsed:
            cap_match = re.search(r'\b(\d+\s*(?:GB|TB))\b', parsed['model_description'], re.IGNORECASE)
            if cap_match:
                parsed['capacity'] = cap_match.group(1).upper().replace(" ", "")

        return parsed
