import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import FilterChips from '../components/ui/FilterChips'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import WorkOrderTable from '../components/workorders/WorkOrderTable'
import CreateWorkOrderModal from '../components/workorders/CreateWorkOrderModal'
import type { WorkOrderSummary } from '../api/types'
import Can from '../components/auth/Can'
import { useAuth } from '../auth/auth-context'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'Open', label: 'Open' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export default function WorkOrdersPage() {
  // the status filter lives in the URL (?status=Completed) so it survives a refresh and can be linked to
  const [params, setParams] = useSearchParams()
  const { can } = useAuth()
  const seesAll = can('workorder.view_all')
  const status = params.get('status') ?? 'Active'
  const [text, setText] = useState('')
  const [showForm, setShowForm] = useState(false)

  const orders = useFetch<WorkOrderSummary[]>(status === 'all' ? '/work-orders/' : `/work-orders/?status=${encodeURIComponent(status)}`)

  function changeStatus(value: string) {
    setParams(value === 'Active' ? {} : { status: value }, { replace: true })
  }

  // quick client-side search on top of the status filter
  const needle = text.trim().toLowerCase()
  const visible = (orders.data ?? []).filter(
    (w) =>
      !needle ||
      [w.wo_number, w.asset_tag, w.model_name, w.description, w.technicians ?? '', w.department]
        .join(' ')
        .toLowerCase()
        .includes(needle),
  )

  return (
    <>
      <PageHeader
        title={seesAll ? 'Work orders' : 'My work orders'}
        subtitle={
          seesAll
            ? 'Maintenance, calibration and repair jobs, with technicians, parts and costs'
            : 'The jobs assigned to you, and the ones you opened yourself'
        }
        actions={
          <Can permission="workorder.create">
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              New work order
            </Button>
          </Can>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search number, asset, description or technician..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </div>
          <FilterChips options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
        </div>

        {orders.error && !orders.data && (
          <div className="p-4">
            <ErrorBox message={orders.error} onRetry={orders.reload} />
          </div>
        )}
        {orders.loading && !orders.data && (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {orders.data && <WorkOrderTable workOrders={visible} exportName="medasset-work-orders" />}
      </Card>

      {showForm && <CreateWorkOrderModal onClose={() => setShowForm(false)} />}
    </>
  )
}
