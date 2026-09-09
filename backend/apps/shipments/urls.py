from django.urls import path
from .views import ShipmentListView, ShipmentDeleteView

app_name = 'shipments'

urlpatterns = [
    path('', ShipmentListView.as_view(), name='list'),
    path('<int:pk>/delete/', ShipmentDeleteView.as_view(), name='delete'),
]

