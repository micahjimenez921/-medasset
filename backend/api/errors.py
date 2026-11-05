"""
Turns database errors into clean JSON answers.

Stored procedures raise business-rule errors with SIGNAL SQLSTATE '45000'
(MySQL error 1644). We map their message to an HTTP status:
    "Authentication required."                    -> 401
    "You do not have permission to do this."      -> 403
    any other business rule message               -> 400
Anything unexpected is logged and answered with a generic 500 so no
internal details leak to the browser.
"""
import logging

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response

log = logging.getLogger("medasset")

AUTH_REQUIRED = "Authentication required."
NOT_ALLOWED = "You do not have permission to do this."


class BusinessRuleError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The request could not be completed."
    default_code = "business_rule"


def handle_exception(exc, context):
    # imported here, not at the top: rest_framework.views loads api.auth, which needs api.db,
    # which needs this file - importing it early would make a circular import
    from rest_framework.views import exception_handler

    response = exception_handler(exc, context)
    if response is not None:
        return response
    log.exception("Unhandled error in %s", context.get("view"))
    return Response({"detail": "Unexpected server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)