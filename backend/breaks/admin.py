from django.contrib import admin
from .models import Attendance, BreakSession, Donation, OffStudySession

@admin.register(BreakSession)
class BreakSessionAdmin(admin.ModelAdmin):
    list_display = ("owner", "label", "started_at", "ended_at", "fine_rupees")
    list_filter = ("label", "week_start")
    search_fields = ("owner__username",)
    readonly_fields = ("owner", "week_start", "label", "planned_minutes", "started_at", "ended_at", "actual_seconds", "fine_rupees", "reason")

    def has_add_permission(self, request):
        return False

@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ("owner", "week_start", "amount_rupees", "donated_at")
    readonly_fields = ("owner", "week_start", "amount_rupees", "donated_at")

    def has_add_permission(self, request):
        return False


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("owner", "day", "checked_at", "reason")
    readonly_fields = ("checked_at")


@admin.register(OffStudySession)
class OffStudySessionAdmin(admin.ModelAdmin):
    list_display = ("owner", "started_at", "ended_at")
    readonly_fields = ("owner", "started_at", "ended_at")
