from django.urls import path
from .views import CustomerListView, CustomerDeleteView

app_name = 'customers'

urlpatterns = [
    path('', CustomerListView.as_view(), name='list'),
    path('<int:pk>/delete/', CustomerDeleteView.as_view(), name='delete'),
]

