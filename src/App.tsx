import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import AssetDetailPage from './pages/AssetDetailPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import AlertsPage from './pages/AlertsPage'
import SchedulesPage from './pages/SchedulesPage'
import ReportsPage from './pages/ReportsPage'
import AuditLogPage from './pages/AuditLogPage'
import ComingSoonPage from './pages/ComingSoonPage'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import UsersPage from './pages/UsersPage'
import RequireAuth from './components/auth/RequireAuth'
import RequirePermission from './components/auth/RequirePermission'

/** Page-level permission check (the database enforces the same rules). */
function Guard({ permission, children }: { permission: string; children: ReactNode }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Guard permission="dashboard.view"><DashboardPage /></Guard>} />
          <Route path="/assets" element={<Guard permission="asset.view"><AssetsPage /></Guard>} />
          <Route path="/assets/:id" element={<Guard permission="asset.view"><AssetDetailPage /></Guard>} />
          <Route path="/work-orders" element={<Guard permission="workorder.view"><WorkOrdersPage /></Guard>} />
          <Route path="/work-orders/:id" element={<Guard permission="workorder.view"><WorkOrderDetailPage /></Guard>} />
          <Route path="/alerts" element={<Guard permission="alert.view"><AlertsPage /></Guard>} />
          <Route path="/schedules" element={<Guard permission="schedule.view"><SchedulesPage /></Guard>} />
          <Route path="/reports" element={<Guard permission="report.view"><ReportsPage /></Guard>} />
          <Route path="/audit-log" element={<Guard permission="audit.view"><AuditLogPage /></Guard>} />
          <Route path="/users" element={<Guard permission="user.manage"><UsersPage /></Guard>} />
          <Route path="*" element={<ComingSoonPage title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  )
}
