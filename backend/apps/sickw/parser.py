import re
import json
from typing import Dict, Any

class SickwParser:
    """Robust regex, JSON, and key-value parser for Sickw API and raw check reports."""
    
    KEY_MAPPINGS = {
        'model description': 'model_description',
        'model': 'model',
        'model name': 'model',
        'model code': 'model_code',
        'model number': 'model_code',
        'model no': 'model_code',
        'imei': 'imei',
        'imei1': 'imei',
        'imei2': 'imei2',
        'meid': 'meid',
        'serial number': 'serial_number',
        'serial': 'serial_number',
        'sn': 'serial_number',
        'color': 'color',
        'device color': 'color',
        'estimated purchase date': 'estimated_purchase_date',
        'purchase date': 'estimated_purchase_date',
        'warranty status': 'warranty_status',
        'warranty': 'warranty_status',
        'icloud lock': 'icloud_lock',
        'icloud status': 'icloud_lock',
        'icloud': 'icloud_lock',
        'fmi': 'icloud_lock',
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
        'simlock': 'sim_lock_status',
    }

    @classmethod
    def parse_dict_data(cls, data_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Maps arbitrary dictionary keys (like Sickw JSON beta result) to standardized attributes."""
        parsed = {}
        for k, v in data_dict.items():
            if v is None:
                continue
            str_val = str(v).strip()
            clean_k = re.sub(r'^[^\w]+', '', str(k).strip().lower())
            if clean_k in cls.KEY_MAPPINGS:
                field = cls.KEY_MAPPINGS[clean_k]
                if field not in parsed:
                    parsed[field] = str_val
            else:
                # Store unmapped fields as is with snake_case
                field_snake = clean_k.replace(" ", "_").replace("-", "_")
                if field_snake not in parsed:
                    parsed[field_snake] = str_val

        cls._post_process(parsed)
        return parsed

    @classmethod
    def parse(cls, raw_text: str) -> Dict[str, Any]:
        """Parses raw text or JSON string safely into standardized key-value pairs."""
        parsed = {}
        if not raw_text or not str(raw_text).strip():
            return parsed

        raw_str = str(raw_text).strip()

        # 1. Attempt JSON parsing
        if (raw_str.startswith('{') and raw_str.endswith('}')) or (raw_str.startswith('[') and raw_str.endswith(']')):
            try:
                data = json.loads(raw_str)
                if isinstance(data, dict):
                    # Check if Sickw wraps inside "result"
                    result_body = data.get('result')
                    if isinstance(result_body, dict):
                        parsed = cls.parse_dict_data(result_body)
                    else:
                        parsed = cls.parse_dict_data(data)
                    return parsed
            except Exception:
                pass

        # 2. Line by line key-value parsing
        lines = raw_str.splitlines()
        for line in lines:
            line = line.strip()
            if not line or ':' not in line:
                continue

            parts = line.split(':', 1)
            raw_key = parts[0].strip().lower()
            val = parts[1].strip()

            clean_key = re.sub(r'^[^\w]+', '', raw_key)
            if clean_key in cls.KEY_MAPPINGS:
                field_name = cls.KEY_MAPPINGS[clean_key]
                if field_name not in parsed:
                    parsed[field_name] = val

        cls._post_process(parsed)
        return parsed

    @classmethod
    def _post_process(cls, parsed: Dict[str, Any]):
        """Extracts model number (A2218), capacity, color, and formats fields."""
        # Extract Apple A-Number (e.g. A2218, A1524, A3106)
        raw_code = parsed.get('model_code', '') or parsed.get('model_description', '') or parsed.get('model', '')
        match = re.search(r'\b(A\d{4})\b', str(raw_code), re.IGNORECASE)
        if match:
            parsed['model_number'] = match.group(1).upper()
            parsed['model_code'] = match.group(1).upper()
        else:
            # If model_code was mapped from generic "model" or text, clear it if it's not a real A-code
            if 'model_code' in parsed and not re.search(r'\b(A\d{4})\b', str(parsed['model_code']), re.IGNORECASE):
                del parsed['model_code']

        # Fallback: Extract capacity from model_description if capacity is not explicitly present
        if 'capacity' not in parsed and 'model_description' in parsed:
            cap_match = re.search(r'\b(\d+\s*(?:GB|TB))\b', parsed['model_description'], re.IGNORECASE)
            if cap_match:
                parsed['capacity'] = cap_match.group(1).upper().replace(" ", "")

        # Fallback: Extract motherboard color from description or raw text
        if 'color' not in parsed:
            search_text = (parsed.get('model_description', '') + ' ' + ' '.join(str(v) for v in parsed.values())).strip()
            # 1. Hyphen pattern: "Apple - iPhone 15 Pro Max 256GB - Apple Intelligence - Blue Titanium (Unlocked)"
            hyphen_match = re.search(r'-\s*([A-Za-z\s]+?(?:Titanium|Gold|Silver|Black|White|Blue|Purple|Green|Red|Yellow|Pink|Gray|Grey))\b', search_text, re.IGNORECASE)
            if hyphen_match:
                parsed['color'] = hyphen_match.group(1).strip()
            else:
                # 2. Comma pattern: "...,256GB,BLUE TTNM"
                comma_match = re.search(r'\b\d+\s*(?:GB|TB)\s*,\s*([A-Za-z0-9\s]+?)(?:,|$|\n|\r)', search_text, re.IGNORECASE)
                if comma_match:
                    parsed['color'] = comma_match.group(1).strip()
                else:
                    # 3. Direct Apple color keyword match
                    color_kw_match = re.search(
                        r'\b(Blue\s*Titanium|Natural\s*Titanium|Black\s*Titanium|White\s*Titanium|Desert\s*Titanium|'
                        r'Sierra\s*Blue|Pacific\s*Blue|Deep\s*Purple|Alpine\s*Green|Midnight\s*Green|Space\s*Black|'
                        r'Space\s*Gray|Space\s*Grey|Rose\s*Gold|Product\s*Red|Starlight|Midnight|'
                        r'BLUE\s*TTNM|NATURAL\s*TTNM|NAT\s*TTNM|BLACK\s*TTNM|WHITE\s*TTNM|DESERT\s*TTNM)\b',
                        search_text, re.IGNORECASE
                    )
                    if color_kw_match:
                        parsed['color'] = color_kw_match.group(1).strip()
