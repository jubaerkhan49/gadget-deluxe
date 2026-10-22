"""
Copilot Tools: Python functions executed by Gemini during autonomous tool calling.
Each tool is equipped with a docstring, robust error handling, and structured dictionary output.
"""
import logging
from typing import Dict, Any, List, Optional
from django.db.models import Q, Count, Sum
from apps.inventory.models import Device, DeviceHistory, DeviceAssignment
from apps.shipments.models import Shipment
from apps.repairs.models import Repair
from apps.sickw.models import SickwReport
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
