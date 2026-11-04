import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import AssetDetailPage from './pages/AssetDetailPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import WorkOrderDetailPage from './pages/WorkOrderDetailPage'
import AlertsPage from './pages/AlertsPage'
import SchedulesPage from './pages/SchedulesPage'
import ComingSoonPage from './pages/ComingSoonPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/work-orders" element={<WorkOrdersPage />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/reports" element={<ComingSoonPage title="Reports" />} />
        <Route path="/audit-log" element={<ComingSoonPage title="Audit log" />} />
        <Route path="*" element={<ComingSoonPage title="Page not found" />} />
      </Route>
    </Routes>
  )
}
