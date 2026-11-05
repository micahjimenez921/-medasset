"""
Authentication for the API.

* The browser holds a random token in an HttpOnly cookie (JavaScript cannot read it).
* The database stores only its SHA-256 hash (table user_sessions), so a leaked
  database cannot be used to sign in.
* Every request is validated by sp_validate_session (idle + absolute timeout).
* State-changing requests must carry the header  X-Requested-With: MedAsset
  (a custom header cannot be sent cross-site without CORS approval - this blocks CSRF).
* WHAT a user may do is NOT decided here: each stored procedure checks the
  permission itself (sp_require_permission). One source of truth.
"""
import hashlib

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied
from rest_framework.permissions import BasePermission

from .db import call_proc

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")
CSRF_HEADER = "X-Requested-With"
CSRF_VALUE = "MedAsset"


def hash_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def require_csrf_header(request):
    if request.method not in SAFE_METHODS and request.headers.get(CSRF_HEADER) != CSRF_VALUE:
        raise PermissionDenied("Missing security header.")


class AuthUser:
    is_authenticated = True

    def __init__(self, row, permissions):
        self.user_id = row["user_id"]
        self.username = row["username"]
        self.full_name = row["full_name"]
        self.email = row["email"]
        self.role_id = row["role_id"]
        self.role_name = row["role_name"]
        self.must_change_password = bool(row["must_change_password"])
        self.permissions = permissions

    def as_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role_name,
            "must_change_password": self.must_change_password,
            "permissions": self.permissions,
        }


def load_session(token):
    """Validate a cookie token. Returns AuthUser or None."""
    sets = call_proc(None, "sp_validate_session", [hash_token(token), settings.SESSION_IDLE_MINUTES])
    if not sets or not sets[0]:
        return None
    return AuthUser(sets[0][0], [r["code"] for r in sets[1]])


class SessionAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.COOKIES.get(settings.SESSION_COOKIE_NAME)
        if not token:
            return None  # IsSignedIn will answer 401
        require_csrf_header(request)
        user = load_session(token)
        if user is None:
            raise AuthenticationFailed("Your session has ended. Please sign in again.")
        return user, hash_token(token)

    def authenticate_header(self, request):
        return "Session"


class IsSignedIn(BasePermission):
    """Default for every endpoint. Views that may be used before the password
    change set  allow_password_change = True."""

    def has_permission(self, request, view):
        user = request.user
        if user is None or not getattr(user, "is_authenticated", False):
            raise NotAuthenticated("Authentication required.")
        if user.must_change_password and not getattr(view, "allow_password_change", False):
            raise PermissionDenied("You must change your temporary password first.")
        return True
