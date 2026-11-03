import { useState } from 'react'
import { ClipboardList, Package, PackageX, RefreshCw, ShieldAlert, Wallet, Wrench, BellRing } from 'lucide-react'
import { api, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../components/ui/toast-context'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import StatCard from '../components/ui/StatCard'
import AttentionList from '../components/dashboard/AttentionList'
import CostChart from '../components/dashboard/CostChart'
import DepartmentChart from '../components/dashboard/DepartmentChart'
import { formatNumber, formatPeso } from '../lib/format'
import type { CostReport, DashboardData } from '../api/types'

export default function DashboardPage() {
  const dashboard = useFetch<DashboardData>('/dashboard/')
  const costs = useFetch<CostReport>('/reports/costs/')
  const toast = useToast()
  const [running, setRunning] = useState(false)

  const s = dashboard.data?.summary
  const loading = dashboard.loading && !dashboard.data

  async function runCheck() {
    setRunning(true)
    try {
      // calls sp_run_preventive_check - the same logic the daily database event runs
      const result = await api.post<{ alerts_created: number }>('/alerts/run-check/')
      toast.success(
        result.alerts_created > 0
          ? `Preventive check done: ${result.alerts_created} new alert(s) raised.`
          : 'Preventive check done: no new alerts.',
      )
      dashboard.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRunning(false)
    }
  }

  if (dashboard.error && !dashboard.data) {
    return <ErrorBox message={dashboard.error} onRetry={dashboard.reload} />
  }

  const activeFleet = s ? s.in_use + s.in_repair : 0

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your medical equipment and maintenance status"
        actions={
          <Button onClick={runCheck} loading={running}>
            <RefreshCw size={16} />
            Run preventive check
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={s && formatNumber(s.total_assets)}
          icon={Package}
          hint={s ? `${s.in_use} in use · ${s.decommissioned} decommissioned` : undefined}
          loading={loading}
        />
        <StatCard
          label="In repair"
          value={s && formatNumber(s.in_repair)}
          icon={Wrench}
          tone="amber"
          hint={s && activeFleet > 0 ? `${Math.round((s.in_repair / activeFleet) * 100)}% of the active fleet` : undefined}
          loading={loading}
        />
        <StatCard
          label="Open alerts"
          value={s && formatNumber(s.open_alerts)}
          icon={BellRing}
          tone="red"
          hint={s ? `${s.overdue_alerts} overdue` : undefined}
          loading={loading}
        />
        <StatCard
          label="Active work orders"
          value={s && formatNumber(s.active_work_orders)}
          icon={ClipboardList}
          tone="sky"
          hint="Open, assigned or in progress"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CostChart byMonth={costs.data?.by_month} loading={costs.loading && !costs.data} />
        </div>
        <AttentionList items={dashboard.data?.attention} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DepartmentChart rows={dashboard.data?.by_department} loading={loading} />
        </div>
        <div className="grid content-start gap-4">
          <StatCard
            label="Maintenance cost this year"
            value={s && formatPeso(s.maintenance_cost_ytd)}
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            label="Warranties expiring (90 days)"
            value={s && formatNumber(s.warranties_expiring)}
            icon={ShieldAlert}
            tone="amber"
            loading={loading}
          />
          <StatCard
            label="Low-stock spare parts"
            value={s && formatNumber(s.low_stock_parts)}
            icon={PackageX}
            tone="red"
            loading={loading}
          />
        </div>
      </div>
    </>
  )
}
