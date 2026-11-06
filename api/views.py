"""
MedAsset API views.

Every view does the same three things:
  1. read the request (URL parameters, query string or JSON body)
  2. call ONE stored procedure through call_proc()
  3. return the procedure's result sets as JSON

There is no SQL and no business logic in this file - the database owns it.
"""
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .db import call_proc


# ---------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------
def query(request, name):
    """Query-string value, or None when missing/empty (procedures treat NULL as 'no filter')."""
    value = request.query_params.get(name)
    return value if value not in (None, "") else None


def first_row(result_sets):
    return result_sets[0][0] if result_sets and result_sets[0] else {}


class ActionView(APIView):
    """
    Base class for 'POST /<thing>/<id>/<action>/' endpoints.
    Subclasses define  actions = {"action-name": ("sp_name", lambda body: [extra args])}
    The record id is always the first argument of the procedure.
    """
    actions = {}

    def post(self, request, pk, action):
        if action not in self.actions:
            raise NotFound(f"Unknown action '{action}'.")
        proc, build_args = self.actions[action]
        sets = call_proc(request, proc, [pk, *build_args(request.data)])
        return Response(first_row(sets))


# ---------------------------------------------------------------------
# dashboard + lookups
# ---------------------------------------------------------------------
class DashboardView(APIView):
    def get(self, request):
        summary, by_department, attention = call_proc(request, "sp_dashboard_summary")
        return Response({
            "summary": summary[0],
            "by_department": by_department,
            "attention": attention,
        })


class LookupView(APIView):
    def get(self, request, name):
        return Response(call_proc(request, "sp_list_lookup", [name])[0])


# ---------------------------------------------------------------------
# assets
# ---------------------------------------------------------------------
class AssetListView(APIView):
    def get(self, request):
        sets = call_proc(request, "sp_list_assets", [
            query(request, "status"),
            query(request, "department_id"),
            query(request, "search"),
        ])
        return Response(sets[0])

    def post(self, request):
        d = request.data
        sets = call_proc(request, "sp_register_asset", [
            d.get("asset_tag"), d.get("serial_number"), d.get("model_id"),
            d.get("supplier_id"), d.get("location_id"), d.get("purchase_date"),
            d.get("purchase_cost"), d.get("warranty_expiry"), d.get("runtime_hours"),
            d.get("acquisition_type") or "Public bidding", d.get("donor"),
        ])
        return Response(first_row(sets), status=201)


class AssetDetailView(APIView):
    def get(self, request, pk):
        sets = call_proc(request, "sp_get_asset", [pk])
        if not sets[0]:
            raise NotFound("Asset not found.")
        return Response({
            "asset": sets[0][0],
            "schedules": sets[1],
            "transfers": sets[2],
            "status_history": sets[3],
            "work_orders": sets[4],
        })


class AssetActionView(ActionView):
    actions = {
        "transfer":     ("sp_transfer_asset",      lambda d: [d.get("to_location_id"), d.get("reason")]),
        "status":       ("sp_update_asset_status", lambda d: [d.get("status"), d.get("remarks")]),
        "runtime":      ("sp_update_runtime",      lambda d: [d.get("runtime_hours")]),
        "decommission": ("sp_decommission_asset",  lambda d: [d.get("reason")]),
    }


# ---------------------------------------------------------------------
# work orders
# ---------------------------------------------------------------------
class WorkOrderListView(APIView):
    def get(self, request):
        sets = call_proc(request, "sp_list_work_orders", [
            query(request, "status"),
            query(request, "asset_id"),
        ])
        return Response(sets[0])

    def post(self, request):
        d = request.data
        sets = call_proc(request, "sp_create_work_order", [
            d.get("asset_id"), d.get("type_id"), d.get("priority"),
            d.get("description"), d.get("scheduled_date"), d.get("alert_id"),
        ])
        return Response(first_row(sets), status=201)


class WorkOrderDetailView(APIView):
    def get(self, request, pk):
        sets = call_proc(request, "sp_get_work_order", [pk])
        if not sets[0]:
            raise NotFound("Work order not found.")
        return Response({
            "work_order": sets[0][0],
            "labor": sets[1],
            "parts": sets[2],
            "calibration": sets[3][0] if sets[3] else None,
        })


class WorkOrderActionView(ActionView):
    actions = {
        "assign":   ("sp_assign_technician",     lambda d: [d.get("technician_id"), d.get("role")]),
        "start":    ("sp_start_work_order",      lambda d: []),
        "labor":    ("sp_log_labor_hours",       lambda d: [d.get("technician_id"), d.get("hours")]),
        "part":     ("sp_add_part_to_work_order", lambda d: [d.get("part_id"), d.get("quantity")]),
        "complete": ("sp_complete_work_order",   lambda d: [d.get("resolution_notes"),
                                                            d.get("calibration_result"),
                                                            d.get("certificate_no")]),
        "cancel":   ("sp_cancel_work_order",     lambda d: [d.get("reason")]),
    }


# ---------------------------------------------------------------------
# alerts + schedules
# ---------------------------------------------------------------------
class AlertListView(APIView):
    def get(self, request):
        return Response(call_proc(request, "sp_list_alerts", [query(request, "status")])[0])


class AlertActionView(ActionView):
    actions = {
        "acknowledge": ("sp_acknowledge_alert", lambda d: []),
    }


class RunPreventiveCheckView(APIView):
    """Manual trigger of the same check the daily database event performs."""
    def post(self, request):
        return Response(first_row(call_proc(request, "sp_run_preventive_check", [])))


class ScheduleListView(APIView):
    def get(self, request):
        sets = call_proc(request, "sp_list_schedules", [query(request, "asset_id"), query(request, "state")])
        return Response(sets[0])

    def post(self, request):
        d = request.data
        sets = call_proc(request, "sp_create_schedule", [
            d.get("asset_id"), d.get("type_id"), d.get("basis"),
            d.get("interval_days"), d.get("interval_hours"),
            d.get("lead_days"), d.get("lead_hours"), d.get("last_performed"),
        ])
        return Response(first_row(sets), status=201)


class ScheduleActionView(ActionView):
    actions = {
        "toggle": ("sp_toggle_schedule", lambda d: [1 if d.get("is_active") else 0]),
    }


# ---------------------------------------------------------------------
# audit, job logs, reports
# ---------------------------------------------------------------------
class AuditLogView(APIView):
    def get(self, request):
        return Response(call_proc(request, "sp_list_audit_logs", [
            query(request, "table"), query(request, "limit"),
        ])[0])


class JobLogView(APIView):
    def get(self, request):
        return Response(call_proc(request, "sp_list_job_logs", [query(request, "limit")])[0])


class CostReportView(APIView):
    def get(self, request):
        by_department, by_category, by_type, top_assets, by_month = call_proc(
            request, "sp_report_costs", [query(request, "year")]
        )
        return Response({
            "by_department": by_department,
            "by_category": by_category,
            "by_type": by_type,
            "top_assets": top_assets,
            "by_month": by_month,
        })
