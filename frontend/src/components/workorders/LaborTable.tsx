import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { Badge } from '../ui/StatusBadge'
import { useAuth } from '../../auth/auth-context'
import { formatNumber, formatPeso } from '../../lib/format'
import type { LaborLine } from '../../api/types'

const baseColumns: Column<LaborLine>[] = [
  {
    header: 'Technician',
    cell: (l) => (
      <div>
        <p className="font-medium text-slate-900">
          {l.technician} <Badge tone={l.kind === 'External' ? 'amber' : 'green'}>{l.kind}</Badge>
        </p>
        <p className="text-xs text-slate-500">{l.kind === 'External' ? l.company : l.team}</p>
      </div>
    ),
  },
  { header: 'Role', cell: (l) => <Badge tone={l.role === 'Lead' ? 'sky' : 'slate'}>{l.role}</Badge> },
  { header: 'Hours', cell: (l) => formatNumber(l.hours_worked), className: 'text-right' },
]

const costColumns: Column<LaborLine>[] = [
  { header: 'Rate', cell: (l) => `${formatPeso(l.hourly_rate)} / h`, className: 'text-right' },
  {
    header: 'Labor cost',
    cell: (l) => <span className="font-medium text-slate-900">{formatPeso(l.labor_cost)}</span>,
    className: 'text-right',
  },
]

export default function LaborTable({ lines }: { lines: LaborLine[] }) {
  const { can } = useAuth()
  const columns = can('report.view') ? [...baseColumns, ...costColumns] : baseColumns
  return (
    <DataTable
      columns={columns}
      rows={lines}
      rowKey={(l) => l.assignment_id}
      empty="No technician has been assigned yet."
    />
  )
}
