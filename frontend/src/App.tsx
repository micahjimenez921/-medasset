import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import AssetsPage from './pages/AssetsPage'
import AssetDetailPage from './pages/AssetDetailPage'
import ComingSoonPage from './pages/ComingSoonPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
        <Route path="/work-orders" element={<ComingSoonPage title="Work orders" />} />
        <Route path="/work-orders/:id" element={<ComingSoonPage title="Work order details" />} />
        <Route path="/alerts" element={<ComingSoonPage title="Alerts" />} />
        <Route path="/schedules" element={<ComingSoonPage title="Schedules" />} />
        <Route path="/reports" element={<ComingSoonPage title="Reports" />} />
        <Route path="/audit-log" element={<ComingSoonPage title="Audit log" />} />
        <Route path="*" element={<ComingSoonPage title="Page not found" />} />
      </Route>
    </Routes>
  )
}
