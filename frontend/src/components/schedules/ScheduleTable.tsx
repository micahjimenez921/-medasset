import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { api, errorMessage } from '../../api/client'
import { useToast } from '../ui/toast-context'
import Button from '../ui/Button'
import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge, { Badge } from '../ui/StatusBadge'
import { formatDate, formatNumber } from '../../lib/format'
import type { ScheduleStatus } from '../../api/types'

interface ScheduleTableProps {
  schedules: ScheduleStatus[]
  onChanged: () => void
}

function remaining(s: ScheduleStatus): string {
  if (s.days_remaining !== null) {
    return s.days_remaining < 0 ? `${-s.days_remaining} days overdue` : `${s.days_remaining} days`
  }
  if (s.hours_remaining !== null) {
    return s.hours_remaining < 0 ? `${-s.hours_remaining} h over` : `${s.hours_remaining} h`
  }
  return '—'
}

export default function ScheduleTable({ schedules, onChanged }: ScheduleTableProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [busyId, setBusyId] = useState<number | null>(null)

  async function toggle(s: ScheduleStatus) {
    setBusyId(s.schedule_id)
    try {
      await api.post(`/schedules/${s.schedule_id}/toggle/`, { is_active: !s.is_active })
      toast.success(s.is_active ? 'Schedule paused. It will not raise alerts.' : 'Schedule resumed.')
      onChanged()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<ScheduleStatus>[] = [
    {
      header: 'Asset',
      cell: (s) => (
        <div>
          <p className="font-medium text-slate-900">{s.asset_tag}</p>
          <p className="text-xs text-slate-500">
            {s.model_name} · {s.department}
          </p>
        </div>
      ),
      csv: (s) => `${s.asset_tag} - ${s.model_name}`,
    },
    { header: 'Maintenance', cell: (s) => s.type_name, csv: (s) => s.type_name },
    {
      header: 'Interval',
      cell: (s) =>
        s.interval_basis === 'CALENDAR' ? `Every ${s.interval_days} days` : `Every ${formatNumber(s.interval_hours)} h runtime`,
      csv: (s) => (s.interval_basis === 'CALENDAR' ? `${s.interval_days} days` : `${s.interval_hours} h`),
    },
    {
      header: 'Next due',
      cell: (s) =>
        s.interval_basis === 'CALENDAR' ? formatDate(s.next_due_date) : `${formatNumber(s.next_due_hours)} h`,
      csv: (s) => (s.interval_basis === 'CALENDAR' ? (s.next_due_date ?? '') : (s.next_due_hours ?? '')),
    },
    { header: 'Remaining', cell: remaining, csv: remaining },
    {
      header: 'Status',
      cell: (s) => (s.is_active ? <StatusBadge value={s.due_state} /> : <Badge>Paused</Badge>),
      csv: (s) => (s.is_active ? s.due_state : 'Paused'),
    },
    {
      header: 'Action',
      className: 'text-right',
      cell: (s) => (
        <Button
          variant="ghost"
          className="!px-2.5 !py-1.5"
          loading={busyId === s.schedule_id}
          onClick={(e) => {
            e.stopPropagation() // do not open the asset page
            toggle(s)
          }}
        >
          {s.is_active ? <Pause size={14} /> : <Play size={14} />}
          {s.is_active ? 'Pause' : 'Resume'}
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={schedules}
      rowKey={(s) => s.schedule_id}
      onRowClick={(s) => navigate(`/assets/${s.asset_id}`)}
      exportName="medasset-schedules"
      empty="No schedules match this filter."
    />
  )
}
