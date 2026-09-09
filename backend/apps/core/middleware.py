import threading
from typing import Callable, Optional
from django.http import HttpRequest, HttpResponse

_thread_locals = threading.local()

def get_current_request() -> Optional[HttpRequest]:
    return getattr(_thread_locals, 'request', None)

def get_current_user():
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    return None

class AuditLoggingMiddleware:
    """Middleware to attach current request to thread local storage for audit logging."""
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        _thread_locals.request = request
        response = self.get_response(request)
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        return response
