"""Password rules, hashing and temporary-password generation."""
import re
import secrets

from django.contrib.auth.hashers import check_password, make_password  # PBKDF2 + salt

MIN_LENGTH = 10
_dummy = None


def hash_password(raw):
    return make_password(raw)


def verify(raw, hashed):
    return check_password(raw, hashed)


def burn_time(raw):
    """Spend the same time as a real check, so unknown users cannot be told apart by speed."""
    global _dummy
    if _dummy is None:
        _dummy = make_password("not-a-real-password")
    check_password(raw, _dummy)


def policy_error(password, username=""):
    """Return a message when the password is too weak, else None."""
    if not isinstance(password, str) or len(password) < MIN_LENGTH:
        return f"Password must be at least {MIN_LENGTH} characters."
    if len(password) > 128:
        return "Password is too long (max 128 characters)."
    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password) or not re.search(r"\d", password):
        return "Password needs an uppercase letter, a lowercase letter and a number."
    if username and username.lower() in password.lower():
        return "Password must not contain the username."
    return None


def temporary_password():
    """Random, easy-to-read password (no 0/O/1/l/I) that always passes the policy."""
    upper, lower, digits = "ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789"
    chars = [secrets.choice(upper), secrets.choice(lower), secrets.choice(digits)]
    chars += [secrets.choice(upper + lower + digits) for _ in range(11)]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)
