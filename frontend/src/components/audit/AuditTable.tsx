import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge from '../ui/StatusBadge'
import ChangeSummary from './ChangeSummary'
import { changesToText, describeChanges, TABLE_LABELS } from '../../lib/audit'
import { formatDateTime } from '../../lib/format'
import type { AuditLogEntry } from '../../api/types'

const columns: Column<AuditLogEntry>[] = [
  {
    header: 'When',
    cell: (e) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(e.changed_at)}</span>,
    csv: (e) => e.changed_at,
  },
  {
    header: 'Record',
    cell: (e) => (
      <div>
        <p className="font-medium text-slate-900">{TABLE_LABELS[e.table_name] ?? e.table_name}</p>
        <p className="text-xs text-slate-500">#{e.record_id}</p>
      </div>
    ),
    csv: (e) => `${TABLE_LABELS[e.table_name] ?? e.table_name} #${e.record_id}`,
  },
  { header: 'Action', cell: (e) => <StatusBadge value={e.action} />, csv: (e) => e.action },
  { header: 'Changed by', cell: (e) => <span className="text-slate-600">{e.changed_by}</span>, csv: (e) => e.changed_by },
  {
    header: 'What changed',
    cell: (e) => <ChangeSummary entry={e} />,
    csv: (e) => changesToText(describeChanges(e.action, e.old_values, e.new_values), e.action),
    className: 'min-w-64',
  },
]

export default function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <DataTable
      columns={columns}
      rows={entries}
      rowKey={(e) => e.audit_id}
      pageSize={15}
      exportName="medasset-audit-log"
      empty="No audit entries match."
    />
  )
}
