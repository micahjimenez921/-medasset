from decimal import Decimal

from django.db import DatabaseError, connection
from rest_framework.exceptions import APIException


class ProcedureError(APIException):
    """Raised when a stored procedure rejects a request (SIGNAL 45000)."""
    status_code = 400
    default_code = "procedure_error"


def _clean(value):
    return float(value) if isinstance(value, Decimal) else value


def call_proc(name, args=(), user="web.user"):
    """
    CALL a stored procedure and return ALL its result sets as a list of
    lists of dicts, e.g. [[{...}, {...}], [{...}]].
    """
    try:
        with connection.cursor() as cursor:
            # the triggers read these session variables for the audit log
            cursor.execute(
                "SET @app_user = %s, @transfer_reason = NULL, @status_remarks = NULL",
                [user],
            )
            cursor.callproc(name, list(args))
            result_sets = []
            while True:
                if cursor.description:
                    cols = [c[0] for c in cursor.description]
                    result_sets.append(
                        [dict(zip(cols, map(_clean, row))) for row in cursor.fetchall()]
                    )
                if not cursor.nextset():
                    break
            return result_sets
    except DatabaseError as exc:
        # the procedure's own message (from SIGNAL ... MESSAGE_TEXT) is in args[1]
        message = exc.args[1] if len(exc.args) > 1 else str(exc)
        raise ProcedureError(message)