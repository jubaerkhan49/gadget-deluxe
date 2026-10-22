"""
Copilot Tools: Python functions executed by Gemini during autonomous tool calling.
Each tool is equipped with a docstring, robust error handling, and structured dictionary output.
"""
import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from django.db import connection
from django.db.models import Q, Count, Sum
from django.utils import timezone
from apps.inventory.models import Device, DeviceHistory, DeviceAssignment
from apps.shipments.models import Shipment
from apps.repairs.models import Repair
from apps.sickw.models import SickwReport
from apps.sales.models import Sale
from apps.orders.models import OtherGoodsOrder
from apps.accounts.models import User

logger = logging.getLogger(__name__)

def search_devices(query: Optional[str] = None, status: Optional[str] = None, limit: int = 8) -> Dict[str, Any]:
    """
    Search devices in inventory by model name, IMEI, serial number, color, or status.
    """
    try:
        limit = min(max(int(limit), 1), 25)
        qs = Device.objects.select_related('current_owner', 'current_shipment').all()
        if status:
            qs = qs.filter(current_status__iexact=status.strip())
        if query:
            q_clean = query.strip()
            qs = qs.filter(
                Q(imei__icontains=q_clean) |
                Q(serial_number__icontains=q_clean) |
                Q(model__icontains=q_clean) |
                Q(color__icontains=q_clean) |
                Q(model_description__icontains=q_clean)
            )
        total_found = qs.count()
        devices = []
        for d in qs[:limit]:
            devices.append({
                "id": d.id,
                "imei": d.imei,
                "model": d.model,
                "color": d.color or "Unknown",
                "capacity": d.capacity or "N/A",
                "variant": d.variant or "N/A",
                "status": d.current_status,
                "current_owner": d.current_owner.username if d.current_owner else "Unassigned",
                "buying_price_bdt": float(d.buying_price) if d.buying_price else None,
                "b2b_selling_price_bdt": float(d.b2b_selling_price) if getattr(d, 'b2b_selling_price', None) else None,
            })
        return {
            "total_matches": total_found,
            "count_returned": len(devices),
            "devices": devices
        }
    except Exception as e:
        logger.exception("Error in search_devices")
        return {"error": str(e)}

def get_inventory_stats(**kwargs) -> Dict[str, Any]:
    """
    Get real-time operational inventory summary: counts by status, total valuation, and active shipments.
    """
    try:
        counts_by_status = dict(
            Device.objects.values('current_status')
            .annotate(total=Count('id'))
            .values_list('current_status', 'total')
        )
        total_devices = Device.objects.count()
        total_in_stock = counts_by_status.get('IN_STOCK', 0)
        total_waiting_shipment = counts_by_status.get('WAITING_SHIPMENT', 0)
        total_under_repair = counts_by_status.get('UNDER_REPAIR', 0)
        total_sold = counts_by_status.get('SOLD', 0)
        
        # Calculate active inventory asset cost (unsold)
        unsold_qs = Device.objects.exclude(current_status='SOLD')
        total_buying_val = unsold_qs.aggregate(val=Sum('buying_price'))['val'] or 0

        pending_shipments_count = Shipment.objects.filter(receive_date__isnull=True).count()

        return {
            "total_registered_devices": total_devices,
            "in_stock": total_in_stock,
            "waiting_shipment": total_waiting_shipment,
            "under_repair": total_under_repair,
            "sold": total_sold,
            "all_status_breakdown": counts_by_status,
            "active_unsold_inventory_value_bdt": float(total_buying_val),
            "shipments_in_transit": pending_shipments_count
        }
    except Exception as e:
        logger.exception("Error in get_inventory_stats")
        return {"error": str(e)}

def get_device_detail(imei_or_id: str, **kwargs) -> Dict[str, Any]:
    """
    Get complete details of a specific device by its IMEI or database ID.
    Includes hardware specs, motherboard color vs manual outlook color, Sickw diagnostics, and current owner.
    """
    try:
        term = str(imei_or_id).strip()
        device = Device.objects.filter(Q(imei=term) | Q(serial_number=term) | Q(id=term if term.isdigit() else -1)).first()
        if not device:
            return {"error": f"No device found matching IMEI or ID '{imei_or_id}'."}

        # Check Sickw reports
        reports = []
        motherboard_color = None
        sim_lock = device.sim_lock_status
        for r in device.sickw_reports.all()[:3]:
            if not motherboard_color and r.color:
                motherboard_color = r.color
            reports.append({
                "service_id": r.service_id,
                "color": r.color,
                "model_code": r.model_code,
                "sim_lock_status": r.sim_lock_status,
                "date": str(r.created_at.date()) if r.created_at else None
            })

        # Check color match
        color_match = None
        if device.color and motherboard_color:
            c1 = device.color.lower()
            c2 = motherboard_color.lower()
            color_match = ("natural" in c1 and "natur" in c2) or ("blue" in c1 and "blue" in c2) or ("black" in c1 and "black" in c2) or ("white" in c1 and "white" in c2)

        return {
            "id": device.id,
            "imei": device.imei,
            "serial_number": device.serial_number or "N/A",
            "model": device.model,
            "model_description": device.model_description or "N/A",
            "outlook_color": device.color or "N/A",
            "motherboard_color": motherboard_color or "Not verified via Sickw",
            "color_matches_motherboard": color_match,
            "capacity": device.capacity or "N/A",
            "variant": device.variant or "N/A",
            "current_status": device.current_status,
            "current_owner": device.current_owner.username if device.current_owner else "Unassigned",
            "sim_lock_status": sim_lock or "Unknown",
            "buying_price_bdt": float(device.buying_price) if device.buying_price else None,
            "b2b_selling_price_bdt": float(device.b2b_selling_price) if getattr(device, 'b2b_selling_price', None) else None,
            "shipment_tracking": device.current_shipment.tracking_number if device.current_shipment else None,
            "diagnostic_reports": reports
        }
    except Exception as e:
        logger.exception("Error in get_device_detail")
        return {"error": str(e)}

def get_shipments_summary(limit: int = 5, status: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """
    Get summary of recent international shipments (China to BD), tracking numbers, suppliers, and arrival dates.
    """
    try:
        limit = min(max(int(limit or 5), 1), 15)
        qs = Shipment.objects.select_related('supplier').all()
        if status:
            s_clean = str(status).lower()
            if any(k in s_clean for k in ['transit', 'pending', 'waiting', 'shipped']):
                qs = qs.filter(receive_date__isnull=True)
            elif any(k in s_clean for k in ['received', 'delivered', 'done']):
                qs = qs.filter(receive_date__isnull=False)
        qs = qs.order_by('-created_at')
        
        shipments = []
        for s in qs[:limit]:
            shipments.append({
                "id": s.id,
                "tracking_number": s.tracking_number,
                "supplier": s.supplier.name if s.supplier else "N/A",
                "shipping_company": s.shipping_company or "N/A",
                "country": s.country or "China",
                "receive_date": str(s.receive_date) if s.receive_date else "In Transit / Not Received",
                "devices_count": s.total_devices_count,
            })
        return {
            "total_shipments": qs.count(),
            "shipments": shipments
        }
    except Exception as e:
        logger.exception("Error in get_shipments_summary")
        return {"error": str(e)}

def get_repairs_summary(**kwargs) -> Dict[str, Any]:
    """
    Get list of devices currently undergoing repair, costs, and repair centers.
    """
    try:
        active_repairs = Repair.objects.filter(status__in=['IN_PROGRESS', 'PENDING_RETURN']).select_related('device')
        repairs = []
        total_cost = 0
        for r in active_repairs[:10]:
            cost = float(r.repair_cost) if r.repair_cost else 0
            total_cost += cost
            repairs.append({
                "repair_id": r.id,
                "device_imei": r.device.imei if r.device else "N/A",
                "device_model": r.device.model if r.device else "N/A",
                "issue": r.issue_description,
                "repair_center": r.repair_center or "N/A",
                "cost_bdt": cost,
                "status": r.status
            })
        return {
            "active_repairs_count": active_repairs.count(),
            "total_active_repair_cost_bdt": total_cost,
            "repairs": repairs
        }
    except Exception as e:
        logger.exception("Error in get_repairs_summary")
        return {"error": str(e)}

def update_device_status(imei: str, new_status: str, notes: Optional[str] = None, user_username: Optional[str] = None) -> Dict[str, Any]:
    """
    Update the status of a device (e.g. IN_STOCK, UNDER_REPAIR, WAITING_SHIPMENT, SOLD).
    """
    try:
        valid_statuses = ['WAITING_SHIPMENT', 'IN_STOCK', 'PENDING_SALE', 'UNDER_REPAIR', 'SOLD', 'ASSIGNED', 'RETURNED', 'LOST']
        status_clean = new_status.strip().upper()
        if status_clean not in valid_statuses:
            return {"error": f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}"}

        device = Device.objects.filter(imei=imei.strip()).first()
        if not device:
            return {"error": f"Device with IMEI '{imei}' not found."}

        old_status = device.current_status
        device.current_status = status_clean
        device.save(update_fields=['current_status', 'updated_at'])

        # Log history
        actor = User.objects.filter(username=user_username).first() if user_username else None
        DeviceHistory.objects.create(
            device=device,
            user=actor,
            action_type='STATUS_UPDATE',
            old_state=old_status,
            new_state=f"Status changed to {status_clean} via AI Copilot. {notes or ''}".strip()
        )

        return {
            "success": True,
            "message": f"Device {imei} status updated from {old_status} to {status_clean}.",
            "imei": device.imei,
            "model": device.model,
            "new_status": status_clean
        }
    except Exception as e:
        logger.exception("Error in update_device_status")
        return {"error": str(e)}

def assign_device_to_employee(imei: str, employee_username: str, notes: Optional[str] = None, user_username: Optional[str] = None) -> Dict[str, Any]:
    """
    Assign a device to an employee by their username.
    """
    try:
        device = Device.objects.filter(imei=imei.strip()).first()
        if not device:
            return {"error": f"Device with IMEI '{imei}' not found."}

        employee = User.objects.filter(username=employee_username.strip()).first()
        if not employee:
            return {"error": f"Employee with username '{employee_username}' not found."}

        device.current_owner = employee
        device.current_status = 'ASSIGNED'
        device.save(update_fields=['current_owner', 'current_status', 'updated_at'])

        # Create active assignment
        DeviceAssignment.objects.filter(device=device, is_active=True).update(is_active=False)
        DeviceAssignment.objects.create(
            device=device,
            employee=employee,
            notes=notes or "Assigned via AI Copilot",
            is_active=True
        )

        actor = User.objects.filter(username=user_username).first() if user_username else None
        DeviceHistory.objects.create(
            device=device,
            user=actor,
            action_type='ASSIGNMENT',
            new_state=f"Assigned to @{employee.username} via AI Copilot. {notes or ''}".strip()
        )

        return {
            "success": True,
            "message": f"Device {imei} ({device.model}) successfully assigned to @{employee.username}.",
            "imei": device.imei,
            "assigned_to": employee.username
        }
    except Exception as e:
        logger.exception("Error in assign_device_to_employee")
        return {"error": str(e)}

def get_sales_and_orders_summary(date_preset: str = 'today', limit: int = 10, **kwargs) -> Dict[str, Any]:
    """
    Get actual sales transactions, items sold, revenue, and profits for a specific period (today, yesterday, this_week, this_month, all_time).
    """
    try:
        now = timezone.localtime(timezone.now())
        preset = str(date_preset or 'today').lower().strip()
        
        if preset == 'today':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            label = f"Today ({now.strftime('%Y-%m-%d')})"
        elif preset == 'yesterday':
            yesterday = now - timedelta(days=1)
            start_dt = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
            label = f"Yesterday ({yesterday.strftime('%Y-%m-%d')})"
        elif preset in ['this_week', 'week']:
            start_dt = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            label = f"This Week (since {start_dt.strftime('%Y-%m-%d')})"
        elif preset in ['this_month', 'month']:
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            label = f"This Month ({now.strftime('%B %Y')})"
        else: # all_time
            start_dt = None
            end_dt = None
            label = "All Time"

        sales_qs = Sale.objects.select_related('device', 'customer', 'seller').all()
        if start_dt and end_dt:
            sales_qs = sales_qs.filter(sale_date__gte=start_dt, sale_date__lte=end_dt)
            
        sales_count = sales_qs.count()
        total_revenue = sales_qs.aggregate(val=Sum('selling_price'))['val'] or 0
        total_profit = sales_qs.aggregate(val=Sum('profit'))['val'] or 0

        # B2B Delivered
        b2b_qs = Device.objects.filter(is_b2b=True, b2b_status='DELIVERED')
        if start_dt and end_dt:
            b2b_qs = b2b_qs.filter(b2b_delivery_date__gte=start_dt.date(), b2b_delivery_date__lte=end_dt.date())
        b2b_count = b2b_qs.count()
        b2b_revenue = b2b_qs.aggregate(val=Sum('b2b_selling_price'))['val'] or 0

        # Other goods orders delivered or processed
        og_qs = OtherGoodsOrder.objects.all()
        if start_dt and end_dt:
            og_qs = og_qs.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        og_count = og_qs.count()

        sales_items = []
        for s in sales_qs.order_by('-sale_date')[:min(limit, 20)]:
            sales_items.append({
                "invoice_number": s.invoice_number,
                "device_model": s.device.model if s.device else "Unknown",
                "imei": s.device.imei if s.device else "N/A",
                "color": s.device.color if s.device else "N/A",
                "selling_price_bdt": float(s.selling_price) if s.selling_price else 0,
                "profit_bdt": float(s.profit) if s.profit else 0,
                "seller": s.seller.username if s.seller else "N/A",
                "customer": s.customer.name if s.customer else "Walk-in Customer",
                "sale_time": timezone.localtime(s.sale_date).strftime('%I:%M %p') if s.sale_date else "N/A"
            })

        return {
            "period": label,
            "total_items_sold": sales_count + b2b_count,
            "retail_devices_sold_count": sales_count,
            "b2b_devices_delivered_count": b2b_count,
            "other_goods_orders_count": og_count,
            "total_revenue_bdt": float(total_revenue) + float(b2b_revenue),
            "total_profit_bdt": float(total_profit),
            "sales_list": sales_items
        }
    except Exception as e:
        logger.exception("Error in get_sales_and_orders_summary")
        return {"error": str(e)}

def execute_safe_sql_query(query: str, **kwargs) -> Dict[str, Any]:
    """
    Execute a read-only SQL SELECT query against the PostgreSQL/SQLite database to answer any custom, cross-table, or arbitrary analytical questions.
    Only SELECT or WITH statements are allowed.
    """
    try:
        clean_q = query.strip().rstrip(';')
        if not (clean_q.upper().startswith('SELECT') or clean_q.upper().startswith('WITH')):
            return {"error": "Security validation failed: Only read-only SELECT or WITH statements are permitted."}

        # Check for forbidden mutation keywords
        forbidden = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
            'RENAME', 'GRANT', 'REVOKE', 'EXEC', 'CREATE', 'REPLACE'
        ]
        tokens = [t.strip(';,()"`\'') for t in clean_q.upper().split()]
        for f in forbidden:
            if f in tokens:
                return {"error": f"Security validation failed: Forbidden keyword '{f}' detected."}

        # Ensure reasonable LIMIT if not specified
        if 'LIMIT' not in clean_q.upper():
            clean_q += " LIMIT 50"

        with connection.cursor() as cursor:
            cursor.execute(clean_q)
            if not cursor.description:
                return {"rows": [], "count": 0}
            columns = [col[0] for col in cursor.description]
            raw_rows = cursor.fetchall()
            
            # Serialize rows cleanly
            formatted_rows = []
            for r in raw_rows[:50]:
                row_dict = {}
                for col_name, val in zip(columns, r):
                    if hasattr(val, 'isoformat'):
                        row_dict[col_name] = val.isoformat()
                    elif isinstance(val, (int, float, str, bool)) or val is None:
                        row_dict[col_name] = val
                    else:
                        row_dict[col_name] = str(val)
                formatted_rows.append(row_dict)

            return {
                "columns": columns,
                "count": len(formatted_rows),
                "rows": formatted_rows
            }
    except Exception as e:
        try:
            connection.rollback()
        except Exception:
            pass
        logger.warning(f"Error in execute_safe_sql_query: {e}")
        return {
            "error": f"SQL execution error: {str(e)}. (Note: The database is PostgreSQL. Use standard date ranges like s.sale_date >= '2026-10-01' instead of strftime)."
        }

def _check_color_match(c1_str: Optional[str], c2_str: Optional[str]) -> Optional[bool]:
    """Helper to detect if physical housing color matches factory motherboard color."""
    if not c1_str or not c2_str:
        return None
    c1 = str(c1_str).lower().strip()
    c2 = str(c2_str).lower().strip()

    def get_color_family(text: str) -> Optional[str]:
        t = text.lower()
        if "natural" in t or "natur" in t:
            return "natural"
        if "black" in t or "space black" in t or "midnight" in t:
            return "black"
        if "white" in t or "starlight" in t or "silver" in t:
            return "white_silver"
        if "blue" in t:
            return "blue"
        if "gold" in t or "desert" in t:
            return "gold"
        if "green" in t or "alpine" in t:
            return "green"
        if "purple" in t or "deep purple" in t:
            return "purple"
        if "red" in t or "product" in t:
            return "red"
        if "gray" in t or "grey" in t or "space gray" in t:
            return "gray"
        return None

    fam1 = get_color_family(c1)
    fam2 = get_color_family(c2)

    if fam1 and fam2:
        return fam1 == fam2
    return c1 == c2

def fetch_live_sickw_report(imei: str, service_id: Optional[str] = None, user_username: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """
    Fetch a live official Sickw API diagnostic report for any device IMEI or Serial Number on demand.
    Supports Service 12 (Apple Model & Specs + Motherboard Color), Service 92 (Color Only), and Service 103 (Carrier & SIM Lock).
    Automatically saves the report in the database, updates device specs, detects housing/motherboard color mismatches, and returns comprehensive diagnostic data.
    """
    import os
    import json
    import urllib.request
    import urllib.error
    from apps.sickw.parser import SickwParser

    clean_imei = str(imei or '').strip().replace('-', '').replace(' ', '')
    if not clean_imei:
        return {"error": "A valid 15-digit IMEI or Serial Number is required to fetch Sickw report."}

    # Normalize service_id
    service_str = str(service_id or '').strip().lower()
    if 'color' in service_str or service_str == '92':
        chosen_service = '92'
    elif 'carrier' in service_str or 'sim' in service_str or 'lock' in service_str or service_str == '103':
        chosen_service = '103'
    elif '12' in service_str or 'spec' in service_str or 'model' in service_str:
        chosen_service = '12'
    else:
        # Default to 12 as it provides Model, Motherboard Color, Capacity, Serial, and Specs
        chosen_service = '12'

    valid_services = {
        '92': 'Color Only',
        '12': 'Model No & Specs (Motherboard Color, Serial, Model)',
        '103': 'Carrier & SIM Lock (Network, FMI, iCloud)'
    }

    api_key = os.environ.get('SICKW_API_KEY', 'P0Z-Y5S-1SU-3JW-81N-BHV-9R7-RK1')
    api_url = f"https://sickw.com/api.php?format=beta&key={api_key}&imei={clean_imei}&service={chosen_service}"

    device = Device.objects.filter(Q(imei=clean_imei) | Q(serial_number=clean_imei) | Q(imei2=clean_imei)).first()

    # If already performed and user didn't request a forced refresh, return existing result to save API credits
    force_refresh = bool(kwargs.get('force_refresh', False))
    if not force_refresh and device:
        existing_report = device.sickw_reports.filter(service_id=chosen_service).order_by('-created_at').first()
        if not existing_report and chosen_service == '92':
            # Service 12 also contains motherboard color
            existing_report = device.sickw_reports.filter(service_id='12').order_by('-created_at').first()

        if existing_report:
            color_match = _check_color_match(device.color, existing_report.color)
            color_warning = None
            if device.color and existing_report.color:
                if color_match is False:
                    color_warning = f"⚠️ CRITICAL HOUSING / MOTHERBOARD MISMATCH: Device physical housing is '{device.color}', but official Apple motherboard is '{existing_report.color}'. This indicates the housing, back glass, or body has been swapped or replaced!"
                elif color_match is True:
                    color_warning = f"✅ Color verified: Physical outlook color '{device.color}' matches official Apple motherboard '{existing_report.color}'."

            return {
                "success": True,
                "is_cached": True,
                "note": f"Verified Sickw Service {chosen_service} report is already logged in the system database (logged on {existing_report.created_at.strftime('%Y-%m-%d %I:%M %p') if existing_report.created_at else 'earlier'}). Returning existing result to save Sickw API credits.",
                "imei": device.imei,
                "device_found_in_inventory": True,
                "service_used": f"Service {chosen_service} ({valid_services.get(chosen_service, '')})",
                "model": device.model or existing_report.model or "Unknown",
                "model_description": existing_report.model_description or device.model_description or "N/A",
                "motherboard_color": existing_report.color or "Unknown",
                "outlook_color": device.color or "Unknown",
                "color_match": color_match,
                "color_check_status": color_warning or "Color verification complete.",
                "sim_lock_status": existing_report.sim_lock_status or device.sim_lock_status or "Unknown",
                "carrier": existing_report.locked_carrier or device.carrier_policy or "Unknown",
                "icloud_lock": existing_report.icloud_lock or device.icloud_status or "Unknown",
                "serial_number": existing_report.serial_number or device.serial_number or "N/A",
                "warranty_status": existing_report.warranty_status or device.warranty_status or "N/A",
                "purchase_country": existing_report.purchase_country or device.purchase_country or "N/A",
                "purchase_date": str(existing_report.estimated_purchase_date or "N/A"),
                "report_id": existing_report.id,
                "report_saved_to_database": True
            }

    try:
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=35) as resp:
            resp_text = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        logger.exception("Sickw API connection failed")
        return {"error": f"Failed to connect to Sickw API: {str(e)}"}

    raw_result_data = None
    data = None
    try:
        data = json.loads(resp_text)
        if isinstance(data, dict):
            error_code = data.get('result')
            is_err = data.get('status') == 'error' or (
                isinstance(error_code, str) and (
                    error_code in ['E01', 'E02', 'R01', 'B01', 'S01', 'S02', 'S03', 'A01', 'A02', 'A03'] or
                    'R02' in error_code or 'duplicate' in error_code.lower()
                )
            )
            if is_err:
                error_map = {
                    'E01': 'IMEI Luhn check failed (invalid IMEI digits)',
                    'E02': 'IMEI or Serial Number format is invalid',
                    'R01': 'IMEI or Serial Number not found on Apple servers or service offline',
                    'B01': 'Low Sickw API account balance',
                    'S01': 'Invalid Service ID',
                    'A01': 'Sickw API key is invalid or server IP not whitelisted',
                }
                if 'duplicate' in str(error_code).lower() or '2 minutes' in str(error_code).lower() or 'R02' in str(error_code):
                    # Duplicate check: return cached report if available in DB
                    if device and device.sickw_reports.exists():
                        latest_r = device.sickw_reports.order_by('-created_at').first()
                        color_match = _check_color_match(device.color, latest_r.color)
                        return {
                            "success": True,
                            "is_cached": True,
                            "note": "Sickw requires a 2-minute waiting period between requests for the same IMEI on the same service. Returning latest verified report from database.",
                            "imei": device.imei,
                            "model": device.model,
                            "motherboard_color": latest_r.color or "Unknown",
                            "outlook_color": device.color or "Unknown",
                            "color_match": color_match,
                            "color_mismatch_warning": None if color_match is not False else f"⚠️ MISMATCH: Housing is '{device.color}' but Sickw motherboard is '{latest_r.color}'.",
                            "sim_lock_status": latest_r.sim_lock_status or device.sim_lock_status or "Unknown",
                            "carrier": latest_r.locked_carrier or device.carrier_policy or "Unknown",
                            "icloud_lock": latest_r.icloud_lock or device.icloud_status or "Unknown",
                            "serial_number": latest_r.serial_number or device.serial_number or "N/A",
                            "warranty_status": latest_r.warranty_status or device.warranty_status or "N/A",
                            "report_id": latest_r.id
                        }
                    return {"error": f"Duplicate order: Sickw requires waiting 2 minutes before re-checking this IMEI on service {chosen_service}. Please try again shortly."}

                return {"error": error_map.get(str(error_code), f"Sickw API Error: {error_code}")}

            raw_result_data = data.get('result')
    except Exception:
        pass

    if isinstance(raw_result_data, dict):
        parsed = SickwParser.parse_dict_data(raw_result_data)
        raw_text = "\n".join([f"{k}: {v}" for k, v in raw_result_data.items() if v is not None])
    else:
        raw_text = str(raw_result_data or resp_text)
        parsed = SickwParser.parse(raw_text)

    if not parsed:
        return {"error": f"Sickw API returned an empty or unparseable response: {resp_text[:200]}"}

    color = parsed.get('color')
    model = parsed.get('model')
    model_description = parsed.get('model_description')
    model_code = parsed.get('model_code') or parsed.get('model_number')
    serial_number = parsed.get('serial_number')
    purchase_date_str = parsed.get('estimated_purchase_date')
    sim_lock = parsed.get('sim_lock_status')
    carrier = parsed.get('locked_carrier')
    icloud = parsed.get('icloud_lock')
    warranty = parsed.get('warranty_status')
    purchase_country = parsed.get('purchase_country')

    purchase_date = None
    if purchase_date_str:
        try:
            from datetime import datetime
            purchase_date = datetime.strptime(purchase_date_str.strip()[:10], "%Y-%m-%d").date()
        except Exception:
            purchase_date = None

    service_prices = {'92': '0.022', '12': '0.025', '103': '0.060'}
    billed_price = None
    if isinstance(data, dict):
        billed_price = data.get('price') or data.get('cost') or data.get('amount')
    if not billed_price:
        billed_price = service_prices.get(chosen_service, '0.000')

    parsed['price'] = billed_price
    color = str(color)[:100] if color else None
    model_code = str(model_code)[:100] if model_code else None

    # Save SickwReport if device exists
    report_obj = None
    if device:
        report_obj = SickwReport.objects.create(
            device=device,
            service_id=chosen_service,
            raw_text=raw_text,
            parsed_data=parsed,
            model_description=str(model_description or device.model_description or '')[:255] or None,
            model=str(model or device.model or '')[:150] or None,
            imei=device.imei,
            imei2=str(parsed.get('imei2') or device.imei2 or '')[:50] or None,
            meid=str(parsed.get('meid') or device.meid or '')[:50] or None,
            serial_number=str(serial_number or device.serial_number or '')[:100] or None,
            color=color,
            model_code=model_code,
            estimated_purchase_date=purchase_date_str or (str(purchase_date) if purchase_date else None),
            warranty_status=str(warranty or device.warranty_status or '')[:150] or None,
            icloud_lock=str(icloud or device.icloud_status or '')[:100] or None,
            purchase_country=str(purchase_country or device.purchase_country or '')[:100] or None,
            locked_carrier=str(carrier or device.carrier_policy or '')[:150] or None,
            sim_lock_status=str(sim_lock or device.sim_lock_status or '')[:100] or None
        )

        updated_fields = []
        if serial_number and not device.serial_number:
            device.serial_number = serial_number
            updated_fields.append('serial_number')
        if sim_lock:
            device.sim_lock_status = sim_lock
            updated_fields.append('sim_lock_status')
        if carrier and not device.carrier_policy:
            device.carrier_policy = carrier
            updated_fields.append('carrier_policy')
        if icloud:
            device.icloud_status = icloud
            updated_fields.append('icloud_status')
        if warranty:
            device.warranty_status = warranty
            updated_fields.append('warranty_status')
        if purchase_date and not device.estimated_purchase_date:
            device.estimated_purchase_date = purchase_date
            updated_fields.append('estimated_purchase_date')
        if purchase_country and not device.purchase_country:
            device.purchase_country = purchase_country
            updated_fields.append('purchase_country')
        if not device.color and color:
            device.color = color
            updated_fields.append('color')

        if updated_fields:
            device.save(update_fields=updated_fields + ['updated_at'])

        actor = User.objects.filter(username=user_username).first() if user_username else None
        DeviceHistory.objects.create(
            device=device,
            user=actor,
            action_type='STATUS_UPDATE',
            new_state=f"Sickw Service {chosen_service} checked via AI Copilot. Motherboard Color: {color or 'N/A'}. Carrier: {carrier or 'N/A'}. SIM: {sim_lock or 'N/A'}."
        )

    # Check color match between manual device outlook color and motherboard color
    outlook_color = device.color if device else None
    color_match = _check_color_match(outlook_color, color)
    color_warning = None
    if outlook_color and color:
        if color_match is False:
            color_warning = f"⚠️ CRITICAL HOUSING / MOTHERBOARD MISMATCH: Device physical housing is '{outlook_color}', but official Apple motherboard is '{color}'. This indicates the housing, back glass, or body has been swapped or replaced!"
        elif color_match is True:
            color_warning = f"✅ Color verified: Physical outlook color '{outlook_color}' matches official Apple motherboard '{color}'."

    return {
        "success": True,
        "imei": clean_imei,
        "device_found_in_inventory": bool(device),
        "service_used": f"Service {chosen_service} ({valid_services.get(chosen_service, '')})",
        "model": model or (device.model if device else "Unknown"),
        "model_description": model_description or "N/A",
        "motherboard_color": color or "Not specified",
        "outlook_color": outlook_color or "Unknown",
        "color_match": color_match,
        "color_check_status": color_warning or "Color verification complete.",
        "sim_lock_status": sim_lock or (device.sim_lock_status if device else "Unknown"),
        "carrier": carrier or (device.carrier_policy if device else "Unknown"),
        "icloud_lock": icloud or (device.icloud_status if device else "Unknown"),
        "serial_number": serial_number or (device.serial_number if device else "N/A"),
        "warranty_status": warranty or (device.warranty_status if device else "N/A"),
        "purchase_country": purchase_country or (device.purchase_country if device else "N/A"),
        "purchase_date": str(purchase_date or purchase_date_str or "N/A"),
        "report_saved_to_database": bool(report_obj)
    }

def get_sickw_account_balance(**kwargs) -> Dict[str, Any]:
    """
    Fetch the live Sickw API account balance and credits in USD.
    """
    import os
    import urllib.request
    try:
        api_key = os.environ.get('SICKW_API_KEY', 'P0Z-Y5S-1SU-3JW-81N-BHV-9R7-RK1')
        api_url = f"https://sickw.com/api.php?key={api_key}&action=balance"
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            balance_str = resp.read().decode('utf-8', errors='ignore').strip()
        balance_val = float(balance_str)
        return {
            "success": True,
            "balance_usd": balance_val,
            "currency": "USD",
            "status": "Active" if balance_val > 0.5 else "Low Balance Warning"
        }
    except Exception as e:
        logger.exception("Error checking Sickw balance")
        return {"error": str(e)}




