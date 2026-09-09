from django.urls import path
from .views import ShipmentListView, ShipmentUpdateView, ShipmentDeleteView

app_name = 'shipments'

urlpatterns = [
    path('', ShipmentListView.as_view(), name='list'),
    path('<int:pk>/edit/', ShipmentUpdateView.as_view(), name='update'),
    path('<int:pk>/delete/', ShipmentDeleteView.as_view(), name='delete'),
]

