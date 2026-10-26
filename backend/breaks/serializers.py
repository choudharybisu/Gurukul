from rest_framework import serializers
from .models import BreakSession

PRESETS = {"Short break": 10, "Lunch": 50, "Dinner": 30}


class StartBreakSerializer(serializers.Serializer):
    label = serializers.ChoiceField(choices=BreakSession.Label.choices)


class DonationSerializer(serializers.Serializer):
    weekStart = serializers.DateField(input_formats=["%Y-%m-%d"])


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, trim_whitespace=True, allow_blank=False)


class AttendanceSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, trim_whitespace=True, allow_blank=True, required=False, default="")


class ReportQuerySerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=["week", "month"])
    anchor = serializers.DateField(input_formats=["%Y-%m-%d"])


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(trim_whitespace=False, style={"input_type": "password"})
