from django.urls import path
from .views import RepairListView, RepairDeleteView

app_name = 'repairs'

urlpatterns = [
    path('', RepairListView.as_view(), name='list'),
    path('<int:pk>/delete/', RepairDeleteView.as_view(), name='delete'),
]

