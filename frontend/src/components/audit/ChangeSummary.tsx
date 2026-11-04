import { describeChanges, humanField, showValue } from '../../lib/audit'
import type { AuditLogEntry } from '../../api/types'

const MAX_SHOWN = 4

/** Shows what an audit entry changed, e.g.  status  In-Use → Repair. */
export default function ChangeSummary({ entry }: { entry: AuditLogEntry }) {
  const changes = describeChanges(entry.action, entry.old_values, entry.new_values)

  if (changes.length === 0) {
    return <span className="text-xs text-slate-400">No tracked field changed</span>
  }

  const shown = changes.slice(0, MAX_SHOWN)
  const hidden = changes.length - shown.length

  return (
    <ul className="space-y-0.5 text-xs">
      {shown.map((c) => (
        <li key={c.field} className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-medium capitalize text-slate-500">{humanField(c.field)}</span>
          {entry.action === 'UPDATE' ? (
            <>
              <span className="text-slate-400 line-through">{showValue(c.from)}</span>
              <span className="text-slate-400">→</span>
              <span className="font-medium text-slate-900">{showValue(c.to)}</span>
            </>
          ) : (
            <span className="font-medium text-slate-900">{showValue(entry.action === 'DELETE' ? c.from : c.to)}</span>
          )}
        </li>
      ))}
      {hidden > 0 && <li className="text-slate-400">+{hidden} more</li>}
    </ul>
  )
}
