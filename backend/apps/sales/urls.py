from django.urls import path
from .views import SaleListView, SaleDeleteView

app_name = 'sales'

urlpatterns = [
    path('', SaleListView.as_view(), name='list'),
    path('<int:pk>/delete/', SaleDeleteView.as_view(), name='delete'),
]

