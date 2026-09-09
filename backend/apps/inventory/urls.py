from django.urls import path
from .views import (
    DeviceListView, DeviceDetailView, DeviceCreateView,
    DeviceAssignView, DeviceStatusUpdateView, DeviceSpecsUpdateView, DeviceOwnershipUpdateView, DeviceQRCodeView,
    GlobalSearchView, DeviceDeleteView
)

app_name = 'inventory'

urlpatterns = [
    path('', DeviceListView.as_view(), name='list'),
    path('add/', DeviceCreateView.as_view(), name='add'),
    path('search/', GlobalSearchView.as_view(), name='search'),
    path('<int:pk>/', DeviceDetailView.as_view(), name='detail'),
    path('<int:pk>/delete/', DeviceDeleteView.as_view(), name='delete'),
    path('<int:pk>/assign/', DeviceAssignView.as_view(), name='assign'),
    path('<int:pk>/update-status/', DeviceStatusUpdateView.as_view(), name='update_status'),
    path('<int:pk>/update-specs/', DeviceSpecsUpdateView.as_view(), name='update_specs'),
    path('<int:pk>/update-ownership/', DeviceOwnershipUpdateView.as_view(), name='update_ownership'),
    path('<int:pk>/qr/', DeviceQRCodeView.as_view(), name='qr_code'),
]


