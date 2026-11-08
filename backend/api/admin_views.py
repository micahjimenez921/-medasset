"""User administration, roles matrix and security events (permissions enforced by the database)."""
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from . import passwords
from .db import call_proc
from .errors import BusinessRuleError


def _query(request, name):
    value = request.query_params.get(name)
    return value if value not in (None, "") else None


class UserListView(APIView):
    def get(self, request):
        return Response(call_proc(request, "sp_list_users")[0])

    def post(self, request):
        d = request.data
        username = str(d.get("username") or "").strip().lower()
        temp = passwords.temporary_password()
        sets = call_proc(request, "sp_create_user", [
            username, d.get("full_name"), d.get("email"), d.get("role_id"),
            passwords.hash_password(temp),
            # technician profile (only used when the role is Technician)
            d.get("employee_no"), d.get("specialization"), d.get("team"), d.get("hourly_rate"),
        ])
        # the temporary password is shown ONCE, here; only its hash is stored
        return Response({**sets[0][0], "temporary_password": temp}, status=201)


class UserActionView(APIView):
    def post(self, request, pk, action):
        d = request.data
        if action == "update":
            sets = call_proc(request, "sp_update_user", [
                pk, d.get("full_name"), d.get("email"), d.get("role_id"),
                1 if d.get("is_active", True) else 0,
            ])
            return Response(sets[0][0])
        if action == "reset-password":
            temp = passwords.temporary_password()
            sets = call_proc(request, "sp_reset_password", [pk, passwords.hash_password(temp)])
            return Response({**sets[0][0], "temporary_password": temp})
        if action == "unlock":
            return Response(call_proc(request, "sp_unlock_user", [pk])[0][0])
        raise NotFound(f"Unknown action '{action}'.")


class RoleListView(APIView):
    def get(self, request):
        roles, permissions, grants = call_proc(request, "sp_list_roles")
        return Response({"roles": roles, "permissions": permissions, "grants": grants})


class SecurityEventView(APIView):
    def get(self, request):
        return Response(call_proc(request, "sp_list_security_events", [
            _query(request, "type"), _query(request, "limit"),
        ])[0])


class TechnicianListView(APIView):
    """Staff and external technicians. Permission 'technician.manage' is checked by the database."""

    def get(self, request):
        technicians, available_accounts = call_proc(request, "sp_list_technicians")
        return Response({"technicians": technicians, "available_accounts": available_accounts})

    def post(self, request):
        d = request.data
        if d.get("kind") == "staff":
            # profile for an existing account that has the Technician role
            sets = call_proc(request, "sp_create_staff_technician", [
                d.get("user_id"), d.get("employee_no"), d.get("specialization"),
                d.get("team"), d.get("hourly_rate"),
            ])
        else:
            sets = call_proc(request, "sp_create_external_technician", [
                d.get("employee_no"), d.get("first_name"), d.get("last_name"),
                d.get("specialization"), d.get("team"), d.get("company"),
                d.get("contact_number"), d.get("email"), d.get("hourly_rate"),
            ])
        return Response(sets[0][0], status=201)


class TechnicianUpdateView(APIView):
    def post(self, request, pk):
        d = request.data
        sets = call_proc(request, "sp_update_technician", [
            pk, d.get("specialization"), d.get("company"), d.get("contact_number"),
            d.get("email"), d.get("hourly_rate"),
            1 if d.get("is_active", True) else 0,
            d.get("user_id"),
        ])
        return Response(sets[0][0])
