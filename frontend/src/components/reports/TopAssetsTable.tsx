import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { formatPeso } from '../../lib/format'
import type { CostReport } from '../../api/types'

type Row = CostReport['top_assets'][number]

const columns: Column<Row>[] = [
  {
    header: 'Asset',
    cell: (a) => (
      <div>
        <p className="font-medium text-slate-900">{a.asset_tag}</p>
        <p className="text-xs text-slate-500">{a.model_name}</p>
      </div>
    ),
    csv: (a) => `${a.asset_tag} - ${a.model_name}`,
  },
  { header: 'Department', cell: (a) => a.department, csv: (a) => a.department },
  { header: 'Work orders', cell: (a) => a.work_orders, csv: (a) => a.work_orders, className: 'text-right' },
  {
    header: 'Total cost',
    cell: (a) => <span className="font-semibold text-slate-900">{formatPeso(a.total_cost)}</span>,
    csv: (a) => a.total_cost,
    className: 'text-right',
  },
]

/** The five assets that cost the most to maintain - candidates for replacement. */
export default function TopAssetsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(a) => a.asset_tag}
      pageSize={5}
      exportName="medasset-top-cost-assets"
      empty="No completed work for this year."
    />
  )
}
