from django.urls import path

from . import admin_views, auth_views, views

urlpatterns = [
    # sign in / out
    path("auth/login/", auth_views.LoginView.as_view()),
    path("auth/logout/", auth_views.LogoutView.as_view()),
    path("auth/me/", auth_views.MeView.as_view()),
    path("auth/change-password/", auth_views.ChangePasswordView.as_view()),

    # administration + compliance
    path("users/", admin_views.UserListView.as_view()),
    path("users/<int:pk>/<str:action>/", admin_views.UserActionView.as_view()),
    path("roles/", admin_views.RoleListView.as_view()),
    path("technicians/", admin_views.TechnicianListView.as_view()),
    path("technicians/<int:pk>/update/", admin_views.TechnicianUpdateView.as_view()),
    path("security-events/", admin_views.SecurityEventView.as_view()),

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
