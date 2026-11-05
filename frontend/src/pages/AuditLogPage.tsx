import { useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import FilterChips from '../components/ui/FilterChips'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import { SelectInput } from '../components/ui/Field'
import AuditTable from '../components/audit/AuditTable'
import JobLogTable from '../components/audit/JobLogTable'
import SecurityEventTable, { SECURITY_EVENT_TYPES } from '../components/audit/SecurityEventTable'
import RolesMatrix from '../components/audit/RolesMatrix'
import { describeChanges, humanField, showValue, TABLE_LABELS } from '../lib/audit'
import type { AuditLogEntry, JobLogEntry, RoleMatrixData, SecurityEvent } from '../api/types'

const VIEWS = [
  { value: 'changes', label: 'Change history' },
  { value: 'security', label: 'Security events' },
  { value: 'jobs', label: 'Scheduled job runs' },
  { value: 'access', label: 'Roles & permissions' },
]

export default function AuditLogPage() {
  const [view, setView] = useState('changes')
  const [table, setTable] = useState('')
  const [limit, setLimit] = useState('100')
  const [text, setText] = useState('')
  const [eventType, setEventType] = useState('')

  const query = new URLSearchParams({ limit })
  if (table) query.set('table', table)

  const audit = useFetch<AuditLogEntry[]>(view === 'changes' ? `/audit-logs/?${query.toString()}` : null)
  const jobs = useFetch<JobLogEntry[]>(view === 'jobs' ? '/job-logs/?limit=100' : null)
  const events = useFetch<SecurityEvent[]>(
    view === 'security' ? `/security-events/?limit=${limit}${eventType ? `&type=${eventType}` : ''}` : null,
  )
  const matrix = useFetch<RoleMatrixData>(view === 'access' ? '/roles/' : null)
  const active = view === 'security' ? events : view === 'jobs' ? jobs : view === 'access' ? matrix : audit

  // quick client-side search over the loaded entries
  const needle = text.trim().toLowerCase()
  const entries = (audit.data ?? []).filter((e) => {
    if (!needle) return true
    const changed = describeChanges(e.action, e.old_values, e.new_values)
      .map((c) => `${humanField(c.field)} ${showValue(c.from)} ${showValue(c.to)}`)
      .join(' ')
    return `${TABLE_LABELS[e.table_name] ?? e.table_name} ${e.record_id} ${e.action} ${e.changed_by} ${changed}`
      .toLowerCase()
      .includes(needle)
  })

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every change, sign-in and permission check, with the real user behind it. Entries are written by the database itself and are append-only: nobody can edit or delete them."
        actions={
          <Button variant="secondary" onClick={active.reload}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <div className="mb-4">
        <FilterChips options={VIEWS} value={view} onChange={setView} />
      </div>

      <Card>
        {view === 'security' && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <SelectInput value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-auto">
              <option value="">All security events</option>
              {SECURITY_EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
            <SelectInput value={limit} onChange={(e) => setLimit(e.target.value)} className="w-auto">
              <option value="100">Latest 100</option>
              <option value="250">Latest 250</option>
              <option value="500">Latest 500</option>
            </SelectInput>
          </div>
        )}
        {view === 'changes' && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search user, record, status or value..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
            <SelectInput value={table} onChange={(e) => setTable(e.target.value)} className="w-auto">
              <option value="">All record types</option>
              {Object.entries(TABLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
            <SelectInput value={limit} onChange={(e) => setLimit(e.target.value)} className="w-auto">
              <option value="100">Latest 100</option>
              <option value="250">Latest 250</option>
              <option value="500">Latest 500</option>
            </SelectInput>
          </div>
        )}

        {active.error && !active.data && (
          <div className="p-4">
            <ErrorBox message={active.error} onRetry={active.reload} />
          </div>
        )}
        {active.loading && !active.data && (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {view === 'changes' && audit.data && <AuditTable entries={entries} />}
        {view === 'security' && events.data && <SecurityEventTable events={events.data} />}
        {view === 'jobs' && jobs.data && <JobLogTable jobs={jobs.data} />}
        {view === 'access' && matrix.data && <RolesMatrix data={matrix.data} />}
      </Card>

      {view === 'jobs' && (
        <p className="mt-3 text-xs text-slate-500">
          EVENT runs come from the MySQL event scheduler at 06:00 every day (run by SYSTEM). MANUAL runs are the
          "Run preventive check" button, recorded with the user who clicked it. For scheduled runs to appear, the event scheduler must be ON (see the README).
        </p>
      )}
    </>
  )
}
