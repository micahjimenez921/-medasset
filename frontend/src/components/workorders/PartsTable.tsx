import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { formatDateTime, formatPeso } from '../../lib/format'
import type { PartLine } from '../../api/types'

const columns: Column<PartLine>[] = [
  {
    header: 'Part',
    cell: (p) => (
      <div>
        <p className="font-medium text-slate-900">{p.part_name}</p>
        <p className="text-xs text-slate-500">{p.part_number}</p>
      </div>
    ),
  },
  { header: 'Quantity', cell: (p) => p.quantity, className: 'text-right' },
  { header: 'Unit cost', cell: (p) => formatPeso(p.unit_cost), className: 'text-right' },
  {
    header: 'Line cost',
    cell: (p) => <span className="font-medium text-slate-900">{formatPeso(p.line_cost)}</span>,
    className: 'text-right',
  },
  { header: 'Used', cell: (p) => formatDateTime(p.used_at) },
]

export default function PartsTable({ lines }: { lines: PartLine[] }) {
  return (
    <DataTable columns={columns} rows={lines} rowKey={(p) => p.wo_part_id} empty="No parts have been used." />
  )
}
