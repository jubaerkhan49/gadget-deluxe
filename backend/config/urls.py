"""
URL Configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.dashboard.urls', namespace='dashboard')),
    path('accounts/', include('apps.accounts.urls', namespace='accounts')),
    path('inventory/', include('apps.inventory.urls', namespace='inventory')),
    path('shipments/', include('apps.shipments.urls', namespace='shipments')),
    path('customers/', include('apps.customers.urls', namespace='customers')),
    path('sales/', include('apps.sales.urls', namespace='sales')),
    path('repairs/', include('apps.repairs.urls', namespace='repairs')),
    path('sickw/', include('apps.sickw.urls', namespace='sickw')),
    path('api/', include('apps.api.urls', namespace='api')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
