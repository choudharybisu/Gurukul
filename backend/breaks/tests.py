from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from . import selectors, services
from .errors import Conflict
from .models import Attendance, BreakSession, Donation, OffStudySession

IST = ZoneInfo("Asia/Kolkata")


class BreakRulesTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user("student", password="secret-for-test")
        self.monday = datetime(2026, 10, 5, 9, 0, tzinfo=IST)
        services.mark_attendance(self.owner, now=self.monday - timedelta(minutes=5))
        services.mark_attendance(self.owner, reason="Current test day", now=timezone.now())

    def test_allowance_boundary_and_flat_fine(self):
        first = services.start_break(self.owner, "Short break", now=self.monday)
        self.assertEqual(first.week_start, date(2026, 10, 5))
        on_time = services.finish_break(self.owner, now=self.monday + timedelta(minutes=10))
        self.assertEqual((on_time.actual_seconds, on_time.fine_rupees), (600, 0))

        second_start = self.monday + timedelta(hours=1)
        services.start_break(self.owner, "Lunch", now=second_start)
        late = services.finish_break(self.owner, now=second_start + timedelta(minutes=50, milliseconds=1))
        self.assertEqual((late.actual_seconds, late.fine_rupees), (3001, 10))

    def test_one_active_break_and_owner_isolation(self):
        services.start_break(self.owner, "Dinner", now=self.monday)
        with self.assertRaises(Conflict):
            services.start_break(self.owner, "Lunch", now=self.monday)
        other = get_user_model().objects.create_user("other", password="secret-for-test")
        services.mark_attendance(other, now=self.monday - timedelta(minutes=5))
        self.assertEqual(services.start_break(other, "Lunch", now=self.monday).owner, other)
        services.finish_break(self.owner, now=self.monday + timedelta(minutes=1))
        with self.assertRaises(Conflict):
            services.finish_break(self.owner, now=self.monday + timedelta(minutes=2))

    def test_sunday_settlement_and_duplicate_payment(self):
        services.start_break(self.owner, "Short break", now=self.monday)
        services.finish_break(self.owner, now=self.monday + timedelta(minutes=11))
        week = date(2026, 10, 5)
        with self.assertRaises(ValidationError):
            services.mark_donated(self.owner, week, day=date(2026, 10, 10))
        payment = services.mark_donated(self.owner, week, day=date(2026, 10, 11))
        self.assertEqual(payment.amount_rupees, 10)
        with self.assertRaises(ValidationError):
            services.mark_donated(self.owner, week, day=date(2026, 10, 11))
        self.assertEqual(Donation.objects.count(), 1)

    def test_late_attendance_and_overrun_need_reasons(self):
        student = get_user_model().objects.create_user("late-student", password="secret-for-test")
        with self.assertRaises(Conflict):
            services.start_break(student, "Short break", now=self.monday)
        with self.assertRaises(ValidationError):
            services.mark_attendance(student, now=self.monday)
        attendance = services.mark_attendance(student, reason="Bus was delayed", now=self.monday)
        self.assertEqual(attendance.reason, "Bus was delayed")
        started = self.monday + timedelta(minutes=10)
        services.start_break(student, "Short break", now=started)
        with self.assertRaises(Conflict):
            services.finish_break(student, now=started + timedelta(minutes=11, seconds=1))
        services.set_break_reason(student, "Unexpected call", now=started + timedelta(minutes=11, seconds=2))
        finished = services.finish_break(student, now=started + timedelta(minutes=11, seconds=3))
        self.assertEqual((finished.reason, finished.fine_rupees), ("Unexpected call", 10))

    def test_off_study_persists_and_report_contains_details(self):
        started = self.monday + timedelta(minutes=10)
        off = services.start_off_study(self.owner, now=started)
        with self.assertRaises(Conflict):
            services.start_break(self.owner, "Lunch", now=started)
        self.assertIsNone(OffStudySession.objects.get(pk=off.pk).ended_at)
        services.finish_off_study(self.owner, now=started + timedelta(minutes=4))
        report = selectors.report(self.owner, "week", started.date())
        self.assertEqual(report["days"][0]["offMinutes"], 4)
        self.assertEqual(report["days"][0]["attendance"], "On time")


class ApiTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user("student", password="secret-for-test")
        services.mark_attendance(self.owner, reason="Test login", now=timezone.now())
        self.client = Client(enforce_csrf_checks=True)

    def test_login_csrf_and_ledger_round_trip(self):
        response = self.client.get("/api/auth/session/")
        self.assertFalse(response.json()["data"]["authenticated"])
        self.assertIn("csrftoken", response.cookies)
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "student", "password": "secret-for-test"},
                                          content_type="application/json").status_code, 403)
        token = self.client.cookies["csrftoken"].value
        response = self.client.post("/api/auth/login/", {"username": "student", "password": "secret-for-test"},
                                    content_type="application/json", HTTP_X_CSRFTOKEN=token,
                                    HTTP_ORIGIN="http://127.0.0.1:5173")
        self.assertEqual(response.status_code, 200)
        token = self.client.cookies["csrftoken"].value  # login rotates the token
        response = self.client.post("/api/breaks/", {"label": "Short break"}, content_type="application/json",
                                    HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="http://127.0.0.1:5173")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get("/api/breaks/").json()["data"]["active"]["label"], "Short break")
        response = self.client.post("/api/breaks/return/", content_type="application/json",
                                    HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="http://127.0.0.1:5173")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.client.get("/api/breaks/").json()["data"]["history"]), 1)

    def test_untrusted_origin_is_rejected(self):
        self.client.force_login(self.owner)
        token = self.client.get("/api/auth/session/").cookies["csrftoken"].value
        response = self.client.post("/api/breaks/", {"label": "Lunch"}, content_type="application/json",
                                    HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="https://untrusted.example")
        self.assertEqual(response.status_code, 403)

    def test_off_study_and_report_endpoints(self):
        self.client.force_login(self.owner)
        token = self.client.get("/api/auth/session/").cookies["csrftoken"].value
        start = self.client.post("/api/off-study/", content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(start.status_code, 201)
        self.assertIsNotNone(self.client.get("/api/breaks/").json()["data"]["off"]["active"])
        stop = self.client.post("/api/off-study/return/", content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(stop.status_code, 200)
        today = services.today_ist().isoformat()
        report = self.client.get(f"/api/reports/?scope=week&anchor={today}")
        self.assertEqual(report.status_code, 200)
        self.assertEqual(report.json()["data"]["scope"], "week")
        self.assertEqual(len(report.json()["data"]["days"]), 7)

    def test_validation_and_private_records(self):
        other = get_user_model().objects.create_user("other", password="secret-for-test")
        services.mark_attendance(other, now=datetime(2026, 10, 5, 8, 55, tzinfo=IST))
        services.start_break(other, "Lunch", now=datetime(2026, 10, 5, 9, 0, tzinfo=IST))
        self.assertEqual(self.client.get("/api/breaks/").status_code, 403)
        self.client.force_login(self.owner)
        token = self.client.get("/api/auth/session/").cookies["csrftoken"].value
        self.assertIsNone(self.client.get("/api/breaks/").json()["data"]["active"])
        response = self.client.post("/api/breaks/", {"label": "Twenty minutes"}, content_type="application/json",
                                    HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())
        self.assertEqual(BreakSession.objects.count(), 1)
