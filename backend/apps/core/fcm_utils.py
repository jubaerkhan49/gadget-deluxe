import os
import json
import base64
import logging
from django.conf import settings
from django.db.models import Q

logger = logging.getLogger(__name__)

_firebase_initialized = False
_firebase_init_source = None
_firebase_init_error = None

def init_firebase():
    """Initializes the Firebase Admin SDK using base64 string, environment JSON, or secret file."""
    global _firebase_initialized, _firebase_init_source, _firebase_init_error
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _firebase_initialized = True
            _firebase_init_source = "existing_firebase_app"
            return True

        # 1. Check Base64 string in environment variable (Render environment friendly, immune to quote/newline issues)
        b64_creds = os.environ.get('FIREBASE_SERVICE_ACCOUNT_BASE64')
        if b64_creds and str(b64_creds).strip():
            try:
                decoded_json = base64.b64decode(b64_creds.strip()).decode('utf-8')
                cred_dict = json.loads(decoded_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                _firebase_init_source = "FIREBASE_SERVICE_ACCOUNT_BASE64"
                logger.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_BASE64.")
                return True
            except Exception as b64_err:
                _firebase_init_error = f"Base64 parse error: {b64_err}"
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64: {b64_err}")

        # 2. Check raw JSON in environment variable
        raw_creds = os.environ.get('FIREBASE_SERVICE_ACCOUNT_RAW')
        if raw_creds and str(raw_creds).strip():
            try:
                cred_dict = json.loads(raw_creds.strip())
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                _firebase_init_source = "FIREBASE_SERVICE_ACCOUNT_RAW"
                logger.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_RAW.")
                return True
            except Exception as raw_err:
                _firebase_init_error = f"Raw JSON parse error: {raw_err}"
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_RAW: {raw_err}")

        # 3. Check candidate file paths
        candidate_paths = [
            os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON'),
            os.path.join(settings.BASE_DIR, 'firebase-service-account.json'),
            '/etc/secrets/firebase-service-account.json', # Render Secret Files mount path
            os.path.join(settings.BASE_DIR.parent, 'firebase-service-account.json')
        ]

        for cred_path in candidate_paths:
            if cred_path and os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    _firebase_initialized = True
                    _firebase_init_source = f"file:{cred_path}"
                    logger.info(f"Firebase Admin initialized from {cred_path}.")
                    return True
                except Exception as file_err:
                    _firebase_init_error = f"Certificate file error on {cred_path}: {file_err}"
                    logger.error(f"Error loading {cred_path}: {file_err}")

        _firebase_init_error = "No valid Firebase credentials found in environment (FIREBASE_SERVICE_ACCOUNT_BASE64/RAW) or file system."
        logger.warning(_firebase_init_error)
        return False

    except Exception as e:
        _firebase_init_error = str(e)
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}", exc_info=True)
        return False


def get_fcm_diagnostic_status():
    """Returns diagnostic report for debugging push notifications."""
    from apps.accounts.models import User, FCMDeviceToken
    is_init = init_firebase()
    
    admin_users = User.objects.filter(Q(role__in=[User.Role.ADMIN, User.Role.MANAGER]) | Q(is_superuser=True))
    admin_tokens_count = FCMDeviceToken.objects.filter(user__in=admin_users).count()
    total_tokens_count = FCMDeviceToken.objects.count()
    
    tokens_by_user = []
    for u in User.objects.filter(fcm_tokens__isnull=False).distinct():
        tokens = list(u.fcm_tokens.values('token', 'device_type', 'updated_at'))
        tokens_by_user.append({
            "username": u.username,
            "role": u.role,
            "token_count": len(tokens),
            "devices": [{"preview": t['token'][:16] + "...", "type": t['device_type'], "updated_at": t['updated_at'].isoformat()} for t in tokens]
        })

    return {
        "firebase_initialized": is_init,
        "init_source": _firebase_init_source,
        "init_error": _firebase_init_error,
        "admin_devices_count": admin_tokens_count,
        "total_registered_devices": total_tokens_count,
        "active_devices_by_user": tokens_by_user
    }


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
            "title": str(title),
            "body": str(body),
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
            "title": str(title),
            "body": str(body),
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


def send_test_push_to_user(user):
    """Sends a real test notification to all active devices of the specified user."""
    from apps.accounts.models import FCMDeviceToken
    tokens = list(FCMDeviceToken.objects.filter(user=user).values_list('token', flat=True))
    if not tokens:
        return 0, f"No FCM device tokens found for @{user.username}. Make sure the Android app is opened with this user logged in."

    title = "🔔 Test Alert: Firebase Push Connected"
    body = f"Hello @{user.username}! Real-time push notifications are working perfectly on this device."
    data = {
        "type": "TEST_ALERT",
        "title": title,
        "body": body
    }
    success = send_push_notification(tokens, title, body, data=data)
    return success, f"Pushed to {len(tokens)} device token(s) (success: {success})"
