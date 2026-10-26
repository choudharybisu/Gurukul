from datetime import datetime, time, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Attendance, BreakSession, Donation, OffStudySession
from .services import today_ist, week_start


def serialize_break(record):
    data = {"id": record.pk, "label": record.label, "plannedMinutes": record.planned_minutes,
            "startedAt": record.started_at.isoformat(), "reason": record.reason or None}
    if record.ended_at is not None:
        data.update(endedAt=record.ended_at.isoformat(), actualSeconds=record.actual_seconds,
                    fineRupees=record.fine_rupees)
    return data


def dashboard(owner):
    now = timezone.now()
    today = today_ist(now)
    current = week_start(today)
    start = midnight(today)
    end = start + timedelta(days=1)
    breaks = BreakSession.objects.filter(owner=owner)
    active = breaks.filter(ended_at__isnull=True).first()
    history = list(breaks.filter(ended_at__gte=start, ended_at__lt=end).order_by("-ended_at"))
    attendance = Attendance.objects.filter(owner=owner, day=today).first()
    off_active = OffStudySession.objects.filter(owner=owner, ended_at__isnull=True).first()
    off_sessions = OffStudySession.objects.filter(owner=owner, started_at__lt=end).filter(
        Q(ended_at__isnull=True) | Q(ended_at__gt=start))
    off_seconds = sum(max(0, (min(item.ended_at or now, end, now) - max(item.started_at, start)).total_seconds())
                      for item in off_sessions)
    weeks = list(breaks.values("week_start").annotate(
        breaks_taken=Count("id"), completed=Count("id", filter=Q(ended_at__isnull=False)),
        fine_rupees=Sum("fine_rupees"),
    ).order_by("-week_start")[:8])
    donations = list(Donation.objects.filter(owner=owner).values("week_start").annotate(
        amount_rupees=Sum("amount_rupees"),
    ).order_by("-week_start")[:8])
    # The UI always shows the current week, even before the first break.
    by_week = {w["week_start"].isoformat(): {
        "weekStart": w["week_start"].isoformat(), "breaksTaken": w["breaks_taken"],
        "completed": w["completed"], "fineRupees": w["fine_rupees"] or 0,
    } for w in weeks}
    key = current.isoformat()
    by_week.setdefault(key, {"weekStart": key, "breaksTaken": 0, "completed": 0, "fineRupees": 0})
    paid = {d["week_start"].isoformat(): d["amount_rupees"] for d in donations}
    current_fine = by_week[key]["fineRupees"]
    recent_overruns = breaks.filter(week_start=current, fine_rupees__gt=0).count()
    return {
        "currentWeek": key, "isSunday": today.weekday() == 6,
        "serverNow": now.isoformat(),
        "active": serialize_break(active) if active else None,
        "history": [serialize_break(item) for item in history],
        "weeks": sorted(by_week.values(), key=lambda w: w["weekStart"], reverse=True)[:8],
        "donations": [{"weekStart": d["week_start"].isoformat(), "amountRupees": d["amount_rupees"]} for d in donations],
        "currentSummary": {"dueRupees": max(0, current_fine - paid.get(key, 0)),
                           "completed": by_week[key]["completed"], "recentOverruns": recent_overruns},
        "settlements": [{"weekStart": week, "completed": row["completed"],
                         "fineRupees": row["fineRupees"], "paidRupees": paid.get(week, 0),
                         "dueRupees": max(0, row["fineRupees"] - paid.get(week, 0)),
                         "canPay": row["fineRupees"] > paid.get(week, 0) and (week < key or today.weekday() == 6)}
                        for week, row in sorted(by_week.items(), reverse=True)[:8]],
        "attendance": {"checkedAt": attendance.checked_at.isoformat(), "reason": attendance.reason or None,
                       "late": timezone.localtime(attendance.checked_at).time() >= time(9)} if attendance else None,
        "attendanceReasonRequired": not attendance and timezone.localtime(now).time() >= time(9),
        "breakReasonRequired": bool(active and not active.reason and
                                    (now - active.started_at).total_seconds() > (active.planned_minutes + 1) * 60),
        "off": {"active": {"startedAt": off_active.started_at.isoformat()} if off_active else None,
                "totalMinutesToday": round(off_seconds / 60, 1)},
    }


def midnight(day):
    return datetime.combine(day, time.min, tzinfo=timezone.get_current_timezone())


def report(owner, scope, anchor):
    first = week_start(anchor) if scope == "week" else anchor.replace(day=1)
    if scope == "week":
        end_day = first + timedelta(days=7)
    else:
        end_day = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    start, end = midnight(first), midnight(end_day)
    now = timezone.now()
    records = BreakSession.objects.filter(owner=owner, started_at__gte=start, started_at__lt=end).order_by("started_at")
    attendance = {x.day: x for x in Attendance.objects.filter(owner=owner, day__gte=first, day__lt=end_day)}
    off_sessions = list(OffStudySession.objects.filter(owner=owner, started_at__lt=end).filter(
        Q(ended_at__isnull=True) | Q(ended_at__gt=start)))
    entries = []
    for item in records:
        actual = round(item.actual_seconds / 60, 1) if item.actual_seconds is not None else None
        excess = round(max(0, item.actual_seconds / 60 - item.planned_minutes), 1) if actual is not None else None
        entries.append({
            "date": timezone.localtime(item.started_at).date().isoformat(), "label": item.label,
            "startedAt": item.started_at.isoformat(), "endedAt": item.ended_at.isoformat() if item.ended_at else None,
            "plannedMinutes": item.planned_minutes, "actualMinutes": actual, "excessMinutes": excess,
            "fineRupees": item.fine_rupees, "reason": item.reason,
        })
    days = []
    day = first
    while day < end_day:
        a = attendance.get(day)
        day_start, day_end = midnight(day), midnight(day + timedelta(days=1))
        off_minutes = sum(max(0, (min(x.ended_at or now, day_end, now) - max(x.started_at, day_start)).total_seconds()) / 60
                          for x in off_sessions)
        day_breaks = [x for x in entries if x["date"] == day.isoformat()]
        days.append({
            "date": day.isoformat(),
            "attendance": ("Upcoming" if day > today_ist(now) else
                           "Late" if a and timezone.localtime(a.checked_at).time() >= time(9) else
                           "On time" if a else "Missing"),
            "checkedAt": a.checked_at.isoformat() if a else None,
            "attendanceReason": a.reason if a else "",
            "breakCount": len(day_breaks),
            "breakMinutes": round(sum(x["actualMinutes"] or 0 for x in day_breaks), 1),
            "excessMinutes": round(sum(x["excessMinutes"] or 0 for x in day_breaks), 1),
            "offMinutes": round(off_minutes, 1),
            "fineRupees": sum(x["fineRupees"] for x in day_breaks),
        })
        day += timedelta(days=1)
    return {"scope": scope, "startDay": first.isoformat(), "endDay": (end_day - timedelta(days=1)).isoformat(),
            "days": days, "entries": entries,
            "totals": {"attendanceDays": sum(x["attendance"] in ("Late", "On time") for x in days),
                       "breakMinutes": round(sum(x["breakMinutes"] for x in days), 1),
                       "excessMinutes": round(sum(x["excessMinutes"] for x in days), 1),
                       "offMinutes": round(sum(x["offMinutes"] for x in days), 1),
                       "fines": sum(x["fineRupees"] for x in days)}}
