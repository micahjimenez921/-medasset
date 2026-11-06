import type { ReactNode } from 'react'
import { Card, CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import { formatDate, formatNumber, formatPeso } from '../../lib/format'
import type { Asset } from '../../api/types'

export default function AssetInfoCard({ asset }: { asset: Asset }) {
  const rows: [string, ReactNode][] = [
    ['Category', `${asset.category} (class ${asset.risk_class})`],
    ['Manufacturer', asset.manufacturer],
    ['Supplier', asset.supplier ?? '—'],
    [
      'Acquired through',
      asset.acquisition_type === 'Donation'
        ? `Donation from ${asset.donor ?? 'unknown donor'}`
        : 'Public bidding (R.A. 12009)',
    ],
    ['Location', `${asset.department} · ${asset.room_name}`],
    ['Purchase date', `${formatDate(asset.purchase_date)} (${asset.age_years} yr old)`],
    [asset.acquisition_type === 'Donation' ? 'Declared value' : 'Purchase cost', formatPeso(asset.purchase_cost)],
    [
      'Warranty',
      <span key="w" className="inline-flex items-center gap-2">
        {formatDate(asset.warranty_expiry)} <StatusBadge value={asset.warranty_status} />
      </span>,
    ],
    ['Runtime', `${formatNumber(asset.runtime_hours)} hours`],
    ['Lifetime maintenance cost', formatPeso(asset.lifetime_maintenance_cost)],
  ]

  return (
    <Card>
      <CardHeader title="Asset information" />
      <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
