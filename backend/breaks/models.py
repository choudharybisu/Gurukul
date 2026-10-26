from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class BreakSession(models.Model):
    class Label(models.TextChoices):
        SHORT = "Short break", "Short break"
        LUNCH = "Lunch", "Lunch"
        DINNER = "Dinner", "Dinner"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_breaks")
    week_start = models.DateField()
    label = models.CharField(max_length=20, choices=Label.choices)
    planned_minutes = models.PositiveSmallIntegerField()
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    actual_seconds = models.PositiveIntegerField(null=True, blank=True)
    fine_rupees = models.PositiveSmallIntegerField(default=0)
    reason = models.CharField(max_length=500, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "week_start"], name="break_owner_week_idx"),
            models.Index(fields=["owner", "ended_at"], name="break_owner_end_idx"),
        ]
        constraints = [models.UniqueConstraint(
            fields=["owner"], condition=Q(ended_at__isnull=True), name="one_active_break_per_owner"
        )]


class Donation(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_donations")
    week_start = models.DateField()
    amount_rupees = models.PositiveIntegerField()
    donated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=["owner", "week_start"], name="donation_owner_week_idx")]


class Attendance(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_attendance")
    day = models.DateField()
    checked_at = models.DateTimeField(default=timezone.now)
    reason = models.CharField(max_length=500, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "day"], name="attendance_owner_day_idx")]


class OffStudySession(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="off_study_sessions")
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["owner"], condition=Q(ended_at__isnull=True), name="one_active_off_session"
        )]
        indexes = [models.Index(fields=["owner", "started_at"], name="off_owner_started_idx")]
