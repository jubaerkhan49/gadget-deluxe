from datetime import datetime
from django.conf import settings

def system_context(request):
    """Context processor providing global template state variables."""
    return {
        'APP_NAME': 'Gadget Deluxe',
        'CURRENT_YEAR': datetime.now().year,
        'USER_ROLE': request.user.role if hasattr(request.user, 'role') else 'GUEST',
        'IS_ADMIN_OR_MANAGER': request.user.role in ['ADMIN', 'MANAGER'] if hasattr(request.user, 'role') else False,
        'SUPABASE_URL': getattr(settings, 'SUPABASE_URL', ''),
        'SUPABASE_ANON_KEY': getattr(settings, 'SUPABASE_ANON_KEY', ''),
    }
