"""
MedAsset settings.
Secrets (database password) are read from backend/.env, which is created by
database/install_database.ps1 and must never be committed to Git.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env():
    """Tiny .env reader (KEY=value per line)."""
    path = BASE_DIR / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_env()

DEBUG = os.environ.get("MEDASSET_DEBUG", "1") == "1"
# Only used for Django internals; sessions are stored in the database, not signed cookies.
SECRET_KEY = os.environ.get("MEDASSET_SECRET_KEY", "dev-only-not-used-for-sessions")
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

INSTALLED_APPS = ["corsheaders", "rest_framework", "api"]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# The web app connects with a restricted account that can ONLY execute
# stored procedures (see database/10_app_account.sql). Never root.
DATABASES = {
    "default": {
        "ENGINE": "config.dbbackend",
        "NAME": "medasset_db",
        "USER": os.environ.get("MEDASSET_DB_USER", "medasset_app"),
        "PASSWORD": os.environ.get("MEDASSET_DB_PASSWORD", ""),
        "HOST": "127.0.0.1",
        "PORT": "3306",
        "OPTIONS": {"charset": "utf8mb4"},
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = False
TIME_ZONE = "Asia/Manila"

# Cookies need the exact origin of the frontend (Vite dev server)
CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS_ALLOW_CREDENTIALS = True

# Browsers must never keep API answers (they contain hospital data)
SECURE_CONTENT_TYPE_NOSNIFF = True

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["api.auth.IsSignedIn"],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "api.errors.handle_exception",
}

# ---- MedAsset session rules (enforced by the database, see sp_validate_session)
SESSION_COOKIE_NAME = "medasset_session"
SESSION_IDLE_MINUTES = 30      # signed out after 30 minutes without activity
SESSION_ABSOLUTE_HOURS = 12    # and never longer than 12 hours in total
LOGIN_MAX_FAILED = 5           # (the database locks the account for 15 minutes)
