import { useNavigate } from 'react-router-dom'
import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge from '../ui/StatusBadge'
import { formatDate, formatNumber } from '../../lib/format'
import type { Asset } from '../../api/types'

const columns: Column<Asset>[] = [
  {
    header: 'Asset',
    cell: (a) => (
      <div>
        <p className="font-medium text-slate-900">{a.asset_tag}</p>
        <p className="text-xs text-slate-500">
          {a.manufacturer} {a.model_name}
        </p>
      </div>
    ),
    csv: (a) => `${a.asset_tag} - ${a.manufacturer} ${a.model_name}`,
  },
  { header: 'Serial number', cell: (a) => <span className="text-slate-600">{a.serial_number}</span>, csv: (a) => a.serial_number },
  { header: 'Category', cell: (a) => a.category, csv: (a) => a.category },
  {
    header: 'Location',
    cell: (a) => (
      <div>
        <p>{a.department}</p>
        <p className="text-xs text-slate-500">{a.room_name}</p>
      </div>
    ),
    csv: (a) => `${a.department} / ${a.room_name}`,
  },
  { header: 'Status', cell: (a) => <StatusBadge value={a.status} />, csv: (a) => a.status },
  {
    header: 'Runtime',
    cell: (a) => `${formatNumber(a.runtime_hours)} h`,
    csv: (a) => a.runtime_hours,
    className: 'text-right',
  },
  {
    header: 'Warranty',
    cell: (a) => (
      <div>
        <StatusBadge value={a.warranty_status} />
        <p className="mt-0.5 text-xs text-slate-500">{formatDate(a.warranty_expiry)}</p>
      </div>
    ),
    csv: (a) => `${a.warranty_status} (${a.warranty_expiry ?? ''})`,
  },
  {
    header: 'Alerts',
    cell: (a) =>
      a.open_alerts > 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{a.open_alerts}</span>
      ) : (
        <span className="text-slate-300">—</span>
      ),
    csv: (a) => a.open_alerts,
    className: 'text-center',
  },
]

export default function AssetTable({ assets }: { assets: Asset[] }) {
  const navigate = useNavigate()
  return (
    <DataTable
      columns={columns}
      rows={assets}
      rowKey={(a) => a.asset_id}
      onRowClick={(a) => navigate(`/assets/${a.asset_id}`)}
      exportName="medasset-assets"
      empty="No assets match your filters."
    />
  )
}
