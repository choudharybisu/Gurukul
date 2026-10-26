from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


class Conflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The record changed. Please refresh and try again."


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None
    detail = response.data
    fields = detail if isinstance(detail, dict) and "detail" not in detail else None
    message = str(detail.get("detail", "Please check the submitted fields.")) if isinstance(detail, dict) else str(detail)
    response.data = {"error": {"code": getattr(exc, "default_code", "error"), "message": message}}
    if fields:
        response.data["error"]["fields"] = fields
    return response
