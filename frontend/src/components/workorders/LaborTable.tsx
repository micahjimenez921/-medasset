import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { Badge } from '../ui/StatusBadge'
import { formatNumber, formatPeso } from '../../lib/format'
import type { LaborLine } from '../../api/types'

const columns: Column<LaborLine>[] = [
  {
    header: 'Technician',
    cell: (l) => (
      <div>
        <p className="font-medium text-slate-900">{l.technician}</p>
        <p className="text-xs text-slate-500">{l.specialization ?? '—'}</p>
      </div>
    ),
  },
  { header: 'Role', cell: (l) => <Badge tone={l.role === 'Lead' ? 'sky' : 'slate'}>{l.role}</Badge> },
  { header: 'Hours', cell: (l) => formatNumber(l.hours_worked), className: 'text-right' },
  { header: 'Rate', cell: (l) => `${formatPeso(l.hourly_rate)} / h`, className: 'text-right' },
  {
    header: 'Labor cost',
    cell: (l) => <span className="font-medium text-slate-900">{formatPeso(l.labor_cost)}</span>,
    className: 'text-right',
  },
]

export default function LaborTable({ lines }: { lines: LaborLine[] }) {
  return (
    <DataTable
      columns={columns}
      rows={lines}
      rowKey={(l) => l.assignment_id}
      empty="No technician has been assigned yet."
    />
  )
}
