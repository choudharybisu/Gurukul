from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .serializers import (AttendanceSerializer, DonationSerializer, LoginSerializer,
                          ReasonSerializer, ReportQuerySerializer, StartBreakSerializer)


def success(data, message="OK", status_code=status.HTTP_200_OK):
    return Response({"data": data, "message": message}, status=status_code)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        return success({"authenticated": user.is_authenticated,
                        "username": user.get_username() if user.is_authenticated else None})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None:
            return Response({"error": {"code": "invalid_credentials", "message": "Invalid username or password."}}, status=400)
        login(request, user)
        return success({"authenticated": True, "username": user.get_username()}, "Signed in.")


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return success({"authenticated": False}, "Signed out.")


class BreaksView(APIView):
    def get(self, request):
        return success(selectors.dashboard(request.user))

    def post(self, request):
        serializer = StartBreakSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.start_break(request.user, serializer.validated_data["label"])
        return success(selectors.serialize_break(record), "Break started.", status.HTTP_201_CREATED)


class ReturnView(APIView):
    def post(self, request):
        record = services.finish_break(request.user)
        return success(selectors.serialize_break(record), "Break recorded.")


class BreakReasonView(APIView):
    def post(self, request):
        serializer = ReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.set_break_reason(request.user, serializer.validated_data["reason"])
        return success(selectors.serialize_break(record), "Reason recorded.")


class AttendanceView(APIView):
    def post(self, request):
        serializer = AttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.mark_attendance(request.user, serializer.validated_data["reason"])
        return success({"checkedAt": record.checked_at.isoformat()}, "Attendance marked.", status.HTTP_201_CREATED)


class OffStudyView(APIView):
    def post(self, request):
        record = services.start_off_study(request.user)
        return success({"startedAt": record.started_at.isoformat()}, "Off-study timer started.", status.HTTP_201_CREATED)


class OffStudyReturnView(APIView):
    def post(self, request):
        record = services.finish_off_study(request.user)
        return success({"endedAt": record.ended_at.isoformat()}, "Off-study time recorded.")


class ReportView(APIView):
    def get(self, request):
        services.require_clear(request.user)
        serializer = ReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return success(selectors.report(request.user, **serializer.validated_data))


class DonationsView(APIView):
    def post(self, request):
        serializer = DonationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = services.mark_donated(request.user, serializer.validated_data["weekStart"])
        return success({"weekStart": record.week_start.isoformat(), "amountRupees": record.amount_rupees},
                       "Donation marked as paid.", status.HTTP_201_CREATED)
