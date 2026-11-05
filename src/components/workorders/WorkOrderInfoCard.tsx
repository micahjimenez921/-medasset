import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import { formatDate, formatDateTime } from '../../lib/format'
import type { WorkOrderSummary } from '../../api/types'

export default function WorkOrderInfoCard({ wo }: { wo: WorkOrderSummary }) {
  const rows: [string, ReactNode][] = [
    [
      'Asset',
      <Link key="a" to={`/assets/${wo.asset_id}`} className="font-medium text-teal-700 hover:underline">
        {wo.asset_tag} · {wo.model_name}
      </Link>,
    ],
    ['Department', wo.department],
    ['Maintenance type', wo.type_name],
    ['Priority', <StatusBadge key="p" value={wo.priority} />],
    ['Opened by', wo.created_by],
    ['Opened', formatDateTime(wo.opened_at)],
    ['Scheduled for', formatDate(wo.scheduled_date)],
    ['Started', formatDateTime(wo.started_at)],
    ['Closed', formatDateTime(wo.completed_at)],
  ]

  return (
    <Card>
      <CardHeader title="Work order details" />
      <div className="p-5">
        <p className="text-sm font-medium text-slate-900">{wo.description}</p>

        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {wo.resolution_notes && (
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {wo.status === 'Cancelled' ? 'Cancellation reason' : 'Resolution notes'}
            </p>
            <p className="mt-1">{wo.resolution_notes}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
