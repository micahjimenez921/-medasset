import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../components/ui/toast-context'
import PageHeader from '../components/ui/PageHeader'
import ErrorBox from '../components/ui/ErrorBox'
import FilterChips from '../components/ui/FilterChips'
import RunCheckButton from '../components/alerts/RunCheckButton'
import AlertList from '../components/alerts/AlertList'
import CreateWorkOrderModal from '../components/workorders/CreateWorkOrderModal'
import type { AlertItem, MaintenanceTypeOption } from '../api/types'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Open', label: 'Open' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
]

export default function AlertsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'Active'
  const toast = useToast()

  const alerts = useFetch<AlertItem[]>(status === 'all' ? '/alerts/' : `/alerts/?status=${encodeURIComponent(status)}`)
  const types = useFetch<MaintenanceTypeOption[]>('/lookups/maintenance_types/')

  const [busyId, setBusyId] = useState<number | null>(null)
  const [workOrderFor, setWorkOrderFor] = useState<AlertItem | null>(null)

  function changeStatus(value: string) {
    setParams(value === 'Active' ? {} : { status: value }, { replace: true })
  }

  async function acknowledge(alert: AlertItem) {
    setBusyId(alert.alert_id)
    try {
      await api.post(`/alerts/${alert.alert_id}/acknowledge/`)
      toast.success(`Alert for ${alert.asset_tag} acknowledged.`)
      alerts.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const critical = (alerts.data ?? []).filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length

  return (
    <>
      <PageHeader
        title="Alerts"
        subtitle={
          alerts.data
            ? `${alerts.data.length} alert(s) shown${critical > 0 ? ` · ${critical} critical` : ''}. Alerts are raised by database triggers and the daily scheduled check.`
            : 'Preventive maintenance alerts'
        }
        actions={<RunCheckButton onDone={alerts.reload} />}
      />

      <div className="mb-4">
        <FilterChips options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
      </div>

      {alerts.error && !alerts.data ? (
        <ErrorBox message={alerts.error} onRetry={alerts.reload} />
      ) : (
        <AlertList
          alerts={alerts.data}
          loading={alerts.loading}
          busyId={busyId}
          onAcknowledge={acknowledge}
          onCreateWorkOrder={setWorkOrderFor}
        />
      )}

      {workOrderFor && (
        <CreateWorkOrderModal
          initial={{
            assetId: workOrderFor.asset_id,
            typeId: types.data?.find((t) => t.name === workOrderFor.type_name)?.type_id,
            alertId: workOrderFor.alert_id,
            description: workOrderFor.message,
          }}
          onClose={() => setWorkOrderFor(null)}
        />
      )}
    </>
  )
}
