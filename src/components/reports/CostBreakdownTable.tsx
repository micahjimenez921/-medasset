import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { formatPeso } from '../../lib/format'

interface Row {
  name: string
  work_orders: number
  labor_cost: number
  parts_cost: number
  total_cost: number
}

interface CostBreakdownTableProps {
  /** column title for the first column, e.g. "Department" */
  label: string
  rows: Row[]
  exportName: string
}

/** Cost per group as numbers, with CSV export - the printable version of the charts. */
export default function CostBreakdownTable({ label, rows, exportName }: CostBreakdownTableProps) {
  const columns: Column<Row>[] = [
    { header: label, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>, csv: (r) => r.name },
    { header: 'Work orders', cell: (r) => r.work_orders, csv: (r) => r.work_orders, className: 'text-right' },
    { header: 'Labor', cell: (r) => formatPeso(r.labor_cost), csv: (r) => r.labor_cost, className: 'text-right' },
    { header: 'Parts', cell: (r) => formatPeso(r.parts_cost), csv: (r) => r.parts_cost, className: 'text-right' },
    {
      header: 'Total',
      cell: (r) => <span className="font-semibold text-slate-900">{formatPeso(r.total_cost)}</span>,
      csv: (r) => r.total_cost,
      className: 'text-right',
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.name}
      exportName={exportName}
      empty="No completed work for this year."
    />
  )
}
