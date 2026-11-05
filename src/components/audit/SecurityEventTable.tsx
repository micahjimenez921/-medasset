import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { Badge } from '../ui/StatusBadge'
import { formatDateTime } from '../../lib/format'
import type { SecurityEvent } from '../../api/types'

type Tone = 'green' | 'amber' | 'red' | 'sky' | 'violet' | 'slate'

const LABELS: Record<string, { label: string; tone: Tone }> = {
  LOGIN_SUCCESS: { label: 'Signed in', tone: 'green' },
  LOGOUT: { label: 'Signed out', tone: 'slate' },
  LOGIN_FAILED: { label: 'Failed sign-in', tone: 'amber' },
  LOGIN_BLOCKED: { label: 'Sign-in blocked', tone: 'red' },
  ACCOUNT_LOCKED: { label: 'Account locked', tone: 'red' },
  ACCOUNT_UNLOCKED: { label: 'Account unlocked', tone: 'sky' },
  SESSION_EXPIRED: { label: 'Session expired', tone: 'slate' },
  PERMISSION_DENIED: { label: 'Permission denied', tone: 'red' },
  USER_CREATED: { label: 'User created', tone: 'violet' },
  USER_ACTIVATED: { label: 'User activated', tone: 'violet' },
  USER_DEACTIVATED: { label: 'User deactivated', tone: 'violet' },
  ROLE_CHANGED: { label: 'Role changed', tone: 'violet' },
  PASSWORD_RESET: { label: 'Password reset', tone: 'sky' },
  PASSWORD_CHANGED: { label: 'Password changed', tone: 'sky' },
  BOOTSTRAP_ADMIN: { label: 'First administrator', tone: 'violet' },
  DEMO_DATA_LOAD: { label: 'Demo data loaded', tone: 'slate' },
}

export const SECURITY_EVENT_TYPES = Object.entries(LABELS).map(([value, { label }]) => ({ value, label }))

const columns: Column<SecurityEvent>[] = [
  { header: 'When', cell: (e) => <span className="whitespace-nowrap text-slate-600">{formatDateTime(e.created_at)}</span>, csv: (e) => e.created_at },
  {
    header: 'Event',
    cell: (e) => <Badge tone={LABELS[e.event_type]?.tone ?? 'slate'}>{LABELS[e.event_type]?.label ?? e.event_type}</Badge>,
    csv: (e) => e.event_type,
  },
  { header: 'Account', cell: (e) => <span className="font-medium text-slate-900">{e.username ?? '—'}</span>, csv: (e) => e.username },
  { header: 'Done by', cell: (e) => <span className="text-slate-600">{e.actor ?? '—'}</span>, csv: (e) => e.actor },
  { header: 'Details', cell: (e) => <span className="text-slate-600">{e.detail ?? ''}</span>, csv: (e) => e.detail },
  { header: 'IP address', cell: (e) => <span className="text-xs text-slate-500">{e.ip_address ?? '—'}</span>, csv: (e) => e.ip_address },
]

export default function SecurityEventTable({ events }: { events: SecurityEvent[] }) {
  return (
    <DataTable
      columns={columns}
      rows={events}
      rowKey={(e) => e.event_id}
      pageSize={15}
      exportName="medasset-security-events"
      empty="No security events match."
    />
  )
}
