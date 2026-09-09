from django.contrib import admin
from .models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'module', 'target_repr')
    list_filter = ('action', 'module')
    search_fields = ('target_repr', 'description', 'actor__username')
    ordering = ('-created_at',)
