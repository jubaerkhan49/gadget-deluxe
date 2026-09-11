"""
URL Configuration for config project.
Serves Django Admin, DRF API endpoints, and routes all web routes to the React SPA frontend.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.api.urls', namespace='api')),
    # Route all web traffic to the React SPA index.html
    re_path(r'^(?!api|admin|static|media).*$', TemplateView.as_view(template_name='index.html'), name='react-app'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
