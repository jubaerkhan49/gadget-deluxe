from django.urls import path
from .views import SickwParserView

app_name = 'sickw'

urlpatterns = [
    path('parser/', SickwParserView.as_view(), name='parser'),
]
