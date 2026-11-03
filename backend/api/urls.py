from django.urls import path

from . import views

urlpatterns = [
    # dashboard + dropdown data
    path("dashboard/", views.DashboardView.as_view()),
    path("lookups/<str:name>/", views.LookupView.as_view()),

    # assets
    path("assets/", views.AssetListView.as_view()),
    path("assets/<int:pk>/", views.AssetDetailView.as_view()),
    path("assets/<int:pk>/<str:action>/", views.AssetActionView.as_view()),

    # work orders
    path("work-orders/", views.WorkOrderListView.as_view()),
    path("work-orders/<int:pk>/", views.WorkOrderDetailView.as_view()),
    path("work-orders/<int:pk>/<str:action>/", views.WorkOrderActionView.as_view()),

    # preventive maintenance
    path("alerts/", views.AlertListView.as_view()),
    path("alerts/run-check/", views.RunPreventiveCheckView.as_view()),
    path("alerts/<int:pk>/<str:action>/", views.AlertActionView.as_view()),
    path("schedules/", views.ScheduleListView.as_view()),
    path("schedules/<int:pk>/<str:action>/", views.ScheduleActionView.as_view()),

    # audit + reports
    path("audit-logs/", views.AuditLogView.as_view()),
    path("job-logs/", views.JobLogView.as_view()),
    path("reports/costs/", views.CostReportView.as_view()),
]
