"""
The ONLY place the API talks to the database: call_proc().

Identity: for a signed-in request we send the database exactly one fact,
    SET @app_user_id = <id from the validated session>
and the stored procedure (sp_require_permission) looks the user up, checks
the permission and sets the audit name itself. The browser can never choose
the name that ends up in the audit log.
"""
import logging
from datetime import date, datetime
from decimal import Decimal

from django.db import DatabaseError, connection
from rest_framework.exceptions import NotAuthenticated, PermissionDenied

from .errors import AUTH_REQUIRED, NOT_ALLOWED, BusinessRuleError

log = logging.getLogger("medasset")

SIGNAL_ERROR = 1644  # MySQL/MariaDB: error raised by SIGNAL


def client_ip(request):
    return (request.META.get("REMOTE_ADDR") or "")[:45] if request is not None else ""


def _clean(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat(sep=" ") if isinstance(value, datetime) else value.isoformat()
    if isinstance(value, bytes):  # BIT / TINYINT edge cases
        return int.from_bytes(value, "big")
    return value


def _translate(error):
    code = error.args[0] if error.args else None
    message = str(error.args[1]) if len(error.args) > 1 else ""
    if code == SIGNAL_ERROR:
        if message == AUTH_REQUIRED:
            return NotAuthenticated(AUTH_REQUIRED)
        if message == NOT_ALLOWED:
            return PermissionDenied(NOT_ALLOWED)
        return BusinessRuleError(message)
    if code == 1062:
        return BusinessRuleError("That value already exists.")
    if code in (1452, 1451):
        return BusinessRuleError("That record refers to something that does not exist or is still in use.")
    if code in (1264, 1366, 1292, 1265):
        return BusinessRuleError("One of the values is not valid.")
    log.error("Database error %s: %s", code, message)
    return None


def call_proc(request, name, args=()):
    """
    Run a stored procedure and return ALL its result sets as a list of
    lists of dicts. `request` carries the signed-in user (or None, for the
    few procedures that run before sign-in).
    """
    user = getattr(request, "user", None) if request is not None else None
    user_id = getattr(user, "user_id", None)

    with connection.cursor() as cursor:
        cursor.execute("SET @app_user_id = %s, @app_user = NULL, @app_ip = %s",
                       [user_id, client_ip(request) or None])
        try:
            cursor.callproc(name, list(args))
        except DatabaseError as error:
            translated = _translate(error)
            if translated is None:
                raise
            raise translated from error

        result_sets = []
        while True:
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                result_sets.append([
                    dict(zip(columns, (_clean(v) for v in row))) for row in cursor.fetchall()
                ])
            if not cursor.nextset():
                break
    return result_sets
