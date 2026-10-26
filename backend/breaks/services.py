from datetime import time, timedelta
from math import ceil

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .errors import Conflict
from .models import Attendance, BreakSession, Donation, OffStudySession
from .serializers import PRESETS

FINE_RUPEES = 10


def week_start(day):
    return day - timedelta(days=day.weekday())


def today_ist(now=None):
    return timezone.localtime(now or timezone.now()).date()


def require_clear(owner, *, now=None, allow_break_reason=False):
    now = now or timezone.now()
    if timezone.localtime(now).time() >= time(9) and not Attendance.objects.filter(owner=owner, day=today_ist(now)).exists():
        raise Conflict("Mark today's attendance and give a reason before using the ledger.")
    active = BreakSession.objects.filter(owner=owner, ended_at__isnull=True).first()
    if (active and not allow_break_reason and not active.reason
            and (now - active.started_at).total_seconds() > (active.planned_minutes + 1) * 60):
        raise Conflict("Give a reason for the overdue break first.")


def mark_attendance(owner, reason="", *, now=None):
    now = now or timezone.now()
    if timezone.localtime(now).time() >= time(9) and not reason.strip():
        raise ValidationError({"reason": "Enter a reason for attendance after 9:00 AM."})
    try:
        return Attendance.objects.create(owner=owner, day=today_ist(now), checked_at=now, reason=reason.strip())
    except IntegrityError as exc:
        raise Conflict("Attendance is already marked today.") from exc


def set_break_reason(owner, reason, *, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        require_clear(owner, now=now, allow_break_reason=True)
        active = BreakSession.objects.select_for_update().filter(owner=owner, ended_at__isnull=True).first()
        if active is None:
            raise Conflict("No break is running.")
        active.reason = reason
        active.save(update_fields=["reason"])
        return active


def start_break(owner, label, *, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        # Locking the user also serializes starts and donations on databases that support row locks.
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        require_clear(owner, now=now)
        if BreakSession.objects.filter(owner=owner, ended_at__isnull=True).exists():
            raise Conflict("Finish the active break first.")
        if OffStudySession.objects.filter(owner=owner, ended_at__isnull=True).exists():
            raise Conflict("Finish your off-study session first.")
        try:
            return BreakSession.objects.create(
                owner=owner, week_start=week_start(timezone.localtime(now).date()),
                label=label, planned_minutes=PRESETS[label], started_at=now,
            )
        except IntegrityError as exc:
            raise Conflict("Finish the active break first.") from exc


def finish_break(owner, *, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        require_clear(owner, now=now)
        active = BreakSession.objects.select_for_update().filter(owner=owner, ended_at__isnull=True).first()
        if active is None:
            raise Conflict("No break is running.")
        active.ended_at = now
        active.actual_seconds = max(0, ceil((now - active.started_at).total_seconds()))
        if active.actual_seconds > (active.planned_minutes + 1) * 60 and not active.reason:
            raise Conflict("Give a reason for this overrun first.")
        active.fine_rupees = FINE_RUPEES if active.actual_seconds > active.planned_minutes * 60 else 0
        active.save(update_fields=["ended_at", "actual_seconds", "fine_rupees"])
        return active


def start_off_study(owner, *, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        require_clear(owner, now=now)
        if BreakSession.objects.filter(owner=owner, ended_at__isnull=True).exists():
            raise Conflict("Finish the active break first.")
        if OffStudySession.objects.filter(owner=owner, ended_at__isnull=True).exists():
            raise Conflict("Off-study timer is already running.")
        return OffStudySession.objects.create(owner=owner, started_at=now)


def finish_off_study(owner, *, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        require_clear(owner, now=now)
        active = OffStudySession.objects.select_for_update().filter(owner=owner, ended_at__isnull=True).first()
        if active is None:
            raise Conflict("Off-study timer is not running.")
        active.ended_at = now
        active.save(update_fields=["ended_at"])
        return active


def mark_donated(owner, selected_week, *, day=None):
    require_clear(owner)
    day = day or today_ist()
    current = week_start(day)
    if selected_week > current or selected_week.weekday() != 0:
        raise ValidationError({"weekStart": "Choose a recorded Monday week."})
    if selected_week == current and day.weekday() != 6:
        raise ValidationError({"weekStart": "This week's donation is due on Sunday."})
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=owner.pk)
        fine = BreakSession.objects.filter(owner=owner, week_start=selected_week).aggregate(v=Sum("fine_rupees"))["v"] or 0
        paid = Donation.objects.filter(owner=owner, week_start=selected_week).aggregate(v=Sum("amount_rupees"))["v"] or 0
        due = max(0, fine - paid)
        if not due:
            raise ValidationError({"weekStart": "Nothing is due for this week."})
        return Donation.objects.create(owner=owner, week_start=selected_week, amount_rupees=due)
