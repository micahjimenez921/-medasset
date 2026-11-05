"""Sign in, sign out, who am I, change password."""
import secrets

from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import passwords
from .auth import hash_token, load_session, require_csrf_header
from .db import call_proc, client_ip
from .errors import BusinessRuleError

GENERIC_LOGIN_ERROR = "Invalid username or password, or the account is locked."


def _set_cookie(response, token):
    response.set_cookie(
        settings.SESSION_COOKIE_NAME, token,
        httponly=True, samesite="Lax", secure=not settings.DEBUG, path="/",
    )  # no max_age: a session cookie, gone when the browser closes


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        require_csrf_header(request)
        username = str(request.data.get("username") or "").strip().lower()[:50]
        password = request.data.get("password")
        ip = client_ip(request)
        fail = Response({"detail": GENERIC_LOGIN_ERROR}, status=401)

        if not username or not isinstance(password, str) or not password or len(password) > 200:
            return fail

        sets = call_proc(request, "sp_get_login", [username])
        row = sets[0][0] if sets and sets[0] else None

        if row is None:
            passwords.burn_time(password)
            call_proc(request, "sp_record_login_failure", [username, ip, "UNKNOWN_USER"])
            return fail
        if not row["is_active"]:
            passwords.burn_time(password)
            call_proc(request, "sp_record_login_failure", [username, ip, "INACTIVE"])
            return fail
        if row["is_locked"]:
            passwords.burn_time(password)
            call_proc(request, "sp_record_login_failure", [username, ip, "LOCKED"])
            return fail
        if not passwords.verify(password, row["password_hash"]):
            call_proc(request, "sp_record_login_failure", [username, ip, "BAD_PASSWORD"])
            return fail

        token = secrets.token_urlsafe(32)
        call_proc(request, "sp_create_session", [
            row["user_id"], hash_token(token), ip,
            request.headers.get("User-Agent", "")[:255],
            settings.SESSION_IDLE_MINUTES, settings.SESSION_ABSOLUTE_HOURS,
        ])
        user = load_session(token)
        response = Response(user.as_dict())
        _set_cookie(response, token)
        return response


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        require_csrf_header(request)
        token = request.COOKIES.get(settings.SESSION_COOKIE_NAME)
        if token:
            call_proc(request, "sp_revoke_session", [hash_token(token), "LOGOUT"])
        response = Response({"ok": True})
        response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
        return response


class MeView(APIView):
    allow_password_change = True

    def get(self, request):
        return Response(request.user.as_dict())


class ChangePasswordView(APIView):
    allow_password_change = True

    def post(self, request):
        user = request.user
        current = request.data.get("current_password")
        new = request.data.get("new_password")
        if not isinstance(current, str) or not isinstance(new, str):
            raise BusinessRuleError("Enter your current and new password.")

        sets = call_proc(request, "sp_get_login", [user.username])
        row = sets[0][0]
        if not passwords.verify(current, row["password_hash"]):
            # counts toward the lock-out, in case someone is using a stolen session
            call_proc(request, "sp_record_login_failure", [user.username, client_ip(request), "BAD_PASSWORD"])
            raise PermissionDenied("Current password is incorrect.")
        if new == current:
            raise BusinessRuleError("The new password must be different from the current one.")
        problem = passwords.policy_error(new, user.username)
        if problem:
            raise BusinessRuleError(problem)

        call_proc(request, "sp_change_own_password", [passwords.hash_password(new), request.auth])
        return Response({"ok": True})
