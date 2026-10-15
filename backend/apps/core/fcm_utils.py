import os
import json
import logging
from django.conf import settings
from django.db.models import Q

logger = logging.getLogger(__name__)

_firebase_initialized = False

def init_firebase():
    """Initializes the Firebase Admin SDK once using the service account certificate."""
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        # 1. Check raw JSON in environment variable (useful for cloud production environments like Render)
        raw_creds = os.environ.get('FIREBASE_SERVICE_ACCOUNT_RAW')
        if raw_creds:
            cred_dict = json.loads(raw_creds)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_RAW.")
            return True

        # 2. Check path in environment variable or backend directory
        cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        if not cred_path:
            cred_path = os.path.join(settings.BASE_DIR, 'firebase-service-account.json')

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info(f"Firebase Admin initialized from {cred_path}.")
            return True
        else:
            logger.warning(f"Firebase service account file not found at: {cred_path}. Push notifications disabled.")
            return False

    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}", exc_info=True)
        return False


def send_push_notification(tokens, title, body, data=None):
    """
    Sends a push notification to a list of FCM device tokens.
    Automatically purges invalid / unregistered tokens from the database.
    """
    if not tokens:
        return 0

    if not init_firebase():
        logger.warning("Firebase not initialized; skipping push notification.")
        return 0

    try:
        from firebase_admin import messaging
        from apps.accounts.models import FCMDeviceToken

        # Ensure all data values are strings as required by FCM
        str_data = {}
        if data:
            for k, v in data.items():
                str_data[str(k)] = str(v) if v is not None else ""

        # Android specific high-priority config
        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='admin_sale_approval_channel',
                sound='default',
                default_vibrate_timings=True,
                priority='high',
            ),
            data=str_data
        )

        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=str_data,
            android=android_config
        )

        response = messaging.send_each_for_multicast(message)
        logger.info(f"FCM Multicast sent: {response.success_count} success, {response.failure_count} failure out of {len(tokens)} tokens.")

        # Clean up stale / invalid tokens
        if response.failure_count > 0:
            tokens_to_delete = []
            for idx, resp in enumerate(response.responses):
                if not resp.success and resp.exception:
                    err_code = getattr(resp.exception, 'code', str(resp.exception))
                    if 'unregistered' in str(err_code).lower() or 'senderidmismatch' in str(err_code).lower() or 'invalid' in str(err_code).lower():
                        tokens_to_delete.append(tokens[idx])
            
            if tokens_to_delete:
                deleted_count, _ = FCMDeviceToken.objects.filter(token__in=tokens_to_delete).delete()
                logger.info(f"Pruned {deleted_count} stale/unregistered FCM device tokens.")

        return response.success_count

    except Exception as e:
        logger.error(f"Error sending FCM push notification: {e}", exc_info=True)
        return 0


def notify_admins_new_sale_request(sale_request):
    """
    Notifies all Admin and Manager users that an employee has submitted a new device sale approval request.
    """
    try:
        from apps.accounts.models import User, FCMDeviceToken

        admin_users = User.objects.filter(
            Q(role__in=[User.Role.ADMIN, User.Role.MANAGER]) | Q(is_superuser=True)
        )
        tokens = list(FCMDeviceToken.objects.filter(user__in=admin_users).values_list('token', flat=True))

        if not tokens:
            logger.info("No admin FCM tokens registered to receive sale request alert.")
            return 0

        employee_name = sale_request.employee.get_full_name() or sale_request.employee.username
        model_name = sale_request.device.model if sale_request.device else "Device"
        imei_str = f" ({sale_request.device.imei})" if sale_request.device and sale_request.device.imei else ""
        price_str = f"৳ {sale_request.proposed_price:,.0f}" if sale_request.proposed_price else "price pending"

        title = f"🚨 Sale Approval: {model_name}"
        body = f"{employee_name} submitted sale for {price_str}{imei_str}. Tap to review and confirm."

        data = {
            "type": "SALE_REQUEST_CREATED",
            "request_id": str(sale_request.id),
            "device_id": str(sale_request.device_id) if sale_request.device_id else "",
            "imei": str(sale_request.device.imei) if sale_request.device and sale_request.device.imei else "",
            "model": str(model_name),
            "proposed_price": str(sale_request.proposed_price or ""),
            "employee_name": str(employee_name),
            "customer_name": str(sale_request.customer_name or ""),
            "payment_method": str(sale_request.payment_method or "CASH"),
        }

        return send_push_notification(tokens, title, body, data=data)

    except Exception as e:
        logger.error(f"Failed to notify admins of new sale request #{getattr(sale_request, 'id', '?')}: {e}", exc_info=True)
        return 0


def notify_employee_sale_result(sale_request, approved: bool):
    """
    Notifies the employee who requested the sale about the admin's decision (Approved or Rejected).
    """
    try:
        from apps.accounts.models import FCMDeviceToken

        if not sale_request.employee:
            return 0

        tokens = list(FCMDeviceToken.objects.filter(user=sale_request.employee).values_list('token', flat=True))
        if not tokens:
            logger.info(f"No FCM tokens found for employee @{sale_request.employee.username}.")
            return 0

        model_name = sale_request.device.model if sale_request.device else "Device"
        reviewer_name = (sale_request.reviewed_by.get_full_name() or sale_request.reviewed_by.username) if sale_request.reviewed_by else "Admin"

        if approved:
            price_str = f"৳ {sale_request.confirmed_price:,.0f}" if sale_request.confirmed_price else ""
            inv_str = f" (Invoice #{sale_request.sale.invoice_number})" if sale_request.sale and sale_request.sale.invoice_number else ""
            title = f"✅ Sale Approved: {model_name}"
            body = f"{reviewer_name} confirmed your sale for {price_str}{inv_str}. Device marked as Sold."
            status_code = "APPROVED"
        else:
            title = f"❌ Sale Request Rejected: {model_name}"
            notes_str = f": {sale_request.review_notes}" if sale_request.review_notes else "."
            body = f"Your sale request was rejected by {reviewer_name}{notes_str} Device returned to In Stock."
            status_code = "REJECTED"

        data = {
            "type": "SALE_REQUEST_RESULT",
            "request_id": str(sale_request.id),
            "device_id": str(sale_request.device_id) if sale_request.device_id else "",
            "model": str(model_name),
            "status": status_code,
            "confirmed_price": str(sale_request.confirmed_price or ""),
            "review_notes": str(sale_request.review_notes or "")
        }

        return send_push_notification(tokens, title, body, data=data)

    except Exception as e:
        logger.error(f"Failed to notify employee of sale result #{getattr(sale_request, 'id', '?')}: {e}", exc_info=True)
        return 0
