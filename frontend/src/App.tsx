import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ComingSoonPage from './pages/ComingSoonPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assets" element={<ComingSoonPage title="Assets" />} />
        <Route path="/assets/:id" element={<ComingSoonPage title="Asset details" />} />
        <Route path="/work-orders" element={<ComingSoonPage title="Work orders" />} />
        <Route path="/alerts" element={<ComingSoonPage title="Alerts" />} />
        <Route path="/schedules" element={<ComingSoonPage title="Schedules" />} />
        <Route path="/reports" element={<ComingSoonPage title="Reports" />} />
        <Route path="/audit-log" element={<ComingSoonPage title="Audit log" />} />
        <Route path="*" element={<ComingSoonPage title="Page not found" />} />
      </Route>
    </Routes>
  )
}
