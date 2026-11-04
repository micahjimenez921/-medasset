import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'
import { formatDateTime } from '../../lib/format'
import type { AlertItem } from '../../api/types'

interface AlertCardProps {
  alert: AlertItem
  busy: boolean
  onAcknowledge: (alert: AlertItem) => void
  onCreateWorkOrder: (alert: AlertItem) => void
}

/** One maintenance alert, with the actions that make sense for its current status. */
export default function AlertCard({ alert: a, busy, onAcknowledge, onCreateWorkOrder }: AlertCardProps) {
  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-4 border-l-4 px-5 py-4 ${
        a.status === 'Resolved' ? 'border-l-slate-300' : a.severity === 'Critical' ? 'border-l-red-500' : 'border-l-amber-400'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/assets/${a.asset_id}`} className="font-semibold text-slate-900 hover:text-teal-700">
            {a.asset_tag}
          </Link>
          <span className="text-sm text-slate-500">
            {a.model_name} · {a.department}
          </span>
          <StatusBadge value={a.alert_type} />
          <StatusBadge value={a.status} />
        </div>

        <p className="mt-1.5 text-sm text-slate-700">{a.message}</p>

        <p className="mt-1 text-xs text-slate-400">
          Raised {formatDateTime(a.generated_at)}
          {a.acknowledged_by && ` · acknowledged by ${a.acknowledged_by}`}
          {a.resolved_at && ` · resolved ${formatDateTime(a.resolved_at)}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {a.status === 'Open' && (
          <Button variant="secondary" className="!px-3 !py-1.5" loading={busy} onClick={() => onAcknowledge(a)}>
            Acknowledge
          </Button>
        )}

        {a.work_order_id ? (
          <Link
            to={`/work-orders/${a.work_order_id}`}
            className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            View work order
          </Link>
        ) : (
          a.status !== 'Resolved' && (
            <Button className="!px-3 !py-1.5" onClick={() => onCreateWorkOrder(a)}>
              Create work order
            </Button>
          )
        )}
      </div>
    </li>
  )
}
