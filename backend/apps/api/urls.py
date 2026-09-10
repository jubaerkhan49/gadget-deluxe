from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import (
    UserViewSet, DeviceViewSet, ShipmentViewSet, CustomerViewSet,
    SaleViewSet, RepairViewSet, SickwViewSet,
    SickwParseAPIView, ExportDevicesCSVView
)

app_name = 'api'

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'shipments', ShipmentViewSet, basename='shipment')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'repairs', RepairViewSet, basename='repair')
router.register(r'sickw', SickwViewSet, basename='sickw_report')

urlpatterns = [
    # JWT Auth Endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # OpenAPI / Swagger Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='api:schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='api:schema'), name='redoc'),

    # Specialized Utility Endpoints
    path('sickw/parse-raw/', SickwParseAPIView.as_view(), name='sickw_parse_raw'),
    path('export/devices/csv/', ExportDevicesCSVView.as_view(), name='export_devices_csv'),

    # ViewSet Router URLs
    path('', include(router.urls)),
]
