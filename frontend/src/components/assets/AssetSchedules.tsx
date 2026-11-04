import { Card, CardHeader } from '../ui/Card'
import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge, { Badge } from '../ui/StatusBadge'
import { formatDate, formatNumber } from '../../lib/format'
import type { ScheduleStatus } from '../../api/types'

const columns: Column<ScheduleStatus>[] = [
  { header: 'Maintenance', cell: (s) => <span className="font-medium text-slate-900">{s.type_name}</span> },
  {
    header: 'Interval',
    cell: (s) => (s.interval_basis === 'CALENDAR' ? `Every ${s.interval_days} days` : `Every ${formatNumber(s.interval_hours)} h`),
  },
  {
    header: 'Next due',
    cell: (s) =>
      s.interval_basis === 'CALENDAR' ? formatDate(s.next_due_date) : `${formatNumber(s.next_due_hours)} h`,
  },
  {
    header: 'Remaining',
    cell: (s) => {
      if (s.days_remaining !== null) return s.days_remaining < 0 ? `${-s.days_remaining} days overdue` : `${s.days_remaining} days`
      if (s.hours_remaining !== null) return s.hours_remaining < 0 ? `${-s.hours_remaining} h over` : `${s.hours_remaining} h`
      return '—'
    },
  },
  {
    header: 'Status',
    cell: (s) => (s.is_active ? <StatusBadge value={s.due_state} /> : <Badge>Paused</Badge>),
  },
]

export default function AssetSchedules({ schedules }: { schedules: ScheduleStatus[] }) {
  return (
    <Card>
      <CardHeader title="Preventive maintenance schedules" subtitle="Calendar-based and runtime-based intervals" />
      <DataTable columns={columns} rows={schedules} rowKey={(s) => s.schedule_id} empty="No schedules set for this asset." />
    </Card>
  )
}
