import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import Skeleton from '../ui/Skeleton'
import type { AttentionItem } from '../../api/types'

function dueText(item: AttentionItem): string {
  if (item.days_remaining !== null) {
    const d = item.days_remaining
    if (d < 0) return `${Math.abs(d)} days overdue`
    if (d === 0) return 'Due today'
    return `Due in ${d} days`
  }
  if (item.hours_remaining !== null) {
    const h = item.hours_remaining
    return h < 0 ? `${Math.abs(h)} h over limit` : `${h} h of runtime left`
  }
  return ''
}

interface AttentionListProps {
  items: AttentionItem[] | undefined
  loading: boolean
}

/** Overdue and due-soon maintenance, taken from the vw_schedule_status view. */
export default function AttentionList({ items, loading }: AttentionListProps) {
  return (
    <Card>
      <CardHeader title="Needs attention" subtitle="Overdue and upcoming maintenance" />

      {loading && (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-500">
          <Check className="text-emerald-500" size={28} />
          Nothing is due. All schedules are on track.
        </div>
      )}

      {!loading && items && items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.schedule_id}>
              <Link
                to={`/assets/${item.asset_id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.asset_tag} <span className="font-normal text-slate-500">· {item.model_name}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {item.type_name} · {item.department}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge value={item.due_state} />
                  <p className="mt-1 text-xs text-slate-500">{dueText(item)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
