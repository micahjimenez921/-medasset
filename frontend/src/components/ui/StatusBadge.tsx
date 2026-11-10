import type { ReactNode } from 'react'

type Tone = 'green' | 'amber' | 'red' | 'sky' | 'violet' | 'slate'

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

/** One colour per status word used anywhere in the system. */
const toneByValue: Record<string, Tone> = {
  // asset status
  'In-Use': 'green',
  Repair: 'amber',
  Decommissioned: 'slate',
  // work order status
  Open: 'sky',
  Assigned: 'violet',
  'In Progress': 'amber',
  Completed: 'green',
  Cancelled: 'slate',
  // service requests
  Pending: 'amber',
  Converted: 'green',
  Linked: 'sky',
  Rejected: 'slate',
  // priority
  Low: 'slate',
  Medium: 'sky',
  High: 'amber',
  Critical: 'red',
  // alerts
  UPCOMING: 'amber',
  OVERDUE: 'red',
  Warning: 'amber',
  Acknowledged: 'violet',
  Resolved: 'green',
  // schedules
  Overdue: 'red',
  'Due Soon': 'amber',
  OK: 'green',
  // warranty
  Active: 'green',
  Pass: 'green',
  Fail: 'red',
  Adjusted: 'amber',
  Expiring: 'amber',
  Expired: 'red',
  None: 'slate',
  // audit log
  INSERT: 'green',
  UPDATE: 'sky',
  DELETE: 'red',
  // job log
  EVENT: 'violet',
  MANUAL: 'slate',
}

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export default function StatusBadge({ value }: { value: string }) {
  return <Badge tone={toneByValue[value] ?? 'slate'}>{value}</Badge>
}
