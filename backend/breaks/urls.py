from django.urls import path
from .views import (AttendanceView, BreakReasonView, BreaksView, DonationsView,
                    LoginView, LogoutView, OffStudyReturnView, OffStudyView,
                    ReportView, ReturnView, SessionView)

urlpatterns = [
    path("auth/session/", SessionView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("breaks/", BreaksView.as_view()),
    path("breaks/return/", ReturnView.as_view()),
    path("breaks/reason/", BreakReasonView.as_view()),
    path("attendance/", AttendanceView.as_view()),
    path("off-study/", OffStudyView.as_view()),
    path("off-study/return/", OffStudyReturnView.as_view()),
    path("reports/", ReportView.as_view()),
    path("donations/", DonationsView.as_view()),
]
