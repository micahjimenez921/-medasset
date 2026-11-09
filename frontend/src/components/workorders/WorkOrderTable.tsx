import { Link, useNavigate } from 'react-router-dom'
import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge from '../ui/StatusBadge'
import { useAuth } from '../../auth/auth-context'
import { formatDate, formatPeso } from '../../lib/format'
import type { WorkOrderSummary } from '../../api/types'

interface WorkOrderTableProps {
  workOrders: WorkOrderSummary[]
  /** show the asset column (hide it on an asset's own page) */
  showAsset?: boolean
  exportName?: string
  pageSize?: number
}

export default function WorkOrderTable({ workOrders, showAsset = true, exportName, pageSize }: WorkOrderTableProps) {
  const navigate = useNavigate()
  const { can } = useAuth()

  const columns: Column<WorkOrderSummary>[] = [
    {
      header: 'Work order',
      cell: (w) => (
        <Link to={`/work-orders/${w.work_order_id}`} className="font-medium text-teal-700 hover:underline" onClick={(e) => e.stopPropagation()}>
          {w.wo_number}
        </Link>
      ),
      csv: (w) => w.wo_number,
    },
    ...(showAsset
      ? [
          {
            header: 'Asset',
            cell: (w: WorkOrderSummary) => (
              <div>
                <p className="font-medium text-slate-900">{w.asset_tag}</p>
                <p className="text-xs text-slate-500">{w.model_name}</p>
              </div>
            ),
            csv: (w: WorkOrderSummary) => `${w.asset_tag} - ${w.model_name}`,
          },
        ]
      : []),
    {
      header: 'Type',
      cell: (w) => (
        <div className="max-w-64">
          <p>{w.type_name}</p>
          <p className="truncate text-xs text-slate-500">{w.description}</p>
        </div>
      ),
      csv: (w) => `${w.type_name}: ${w.description}`,
    },
    { header: 'Priority', cell: (w) => <StatusBadge value={w.priority} />, csv: (w) => w.priority },
    { header: 'Status', cell: (w) => <StatusBadge value={w.status} />, csv: (w) => w.status },
    { header: 'Technicians', cell: (w) => w.technicians ?? <span className="text-slate-300">Unassigned</span>, csv: (w) => w.technicians ?? '' },
    { header: 'Opened', cell: (w) => formatDate(w.opened_at), csv: (w) => w.opened_at },
    ...(can('report.view')
      ? [{ header: 'Cost', cell: (w: WorkOrderSummary) => formatPeso(w.total_cost), csv: (w: WorkOrderSummary) => w.total_cost, className: 'text-right' }]
      : []),
  ]

  return (
    <DataTable
      columns={columns}
      rows={workOrders}
      rowKey={(w) => w.work_order_id}
      onRowClick={(w) => navigate(`/work-orders/${w.work_order_id}`)}
      exportName={exportName}
      pageSize={pageSize}
      empty="No work orders."
    />
  )
}
