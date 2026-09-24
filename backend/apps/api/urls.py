from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import (
    UserViewSet, DeviceViewSet, ShipmentViewSet, CustomerViewSet,
    SaleViewSet, RepairViewSet, SickwViewSet,
    SickwParseAPIView, ExportDevicesCSVView, DashboardStatsAPIView,
    AnalyticsStatsAPIView, OtherGoodsOrderViewSet, PublicOrderTrackingAPIView,
    EmployeeApplicationViewSet
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
router.register(r'other-goods', OtherGoodsOrderViewSet, basename='other_goods')
router.register(r'employee-applications', EmployeeApplicationViewSet, basename='employee_application')

urlpatterns = [
    # JWT Auth Endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # OpenAPI / Swagger Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='api:schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='api:schema'), name='redoc'),

    # Public Order Tracking Portal (Unauthenticated)
    path('public/track-order/', PublicOrderTrackingAPIView.as_view(), name='public_track_order'),

    # Specialized Utility Endpoints
    path('dashboard/stats/', DashboardStatsAPIView.as_view(), name='dashboard_stats'),
    path('analytics/', AnalyticsStatsAPIView.as_view(), name='analytics_stats'),
    path('sickw/parse-raw/', SickwParseAPIView.as_view(), name='sickw_parse_raw'),
    path('export/devices/csv/', ExportDevicesCSVView.as_view(), name='export_devices_csv'),

    # ViewSet Router URLs
    path('', include(router.urls)),
]
