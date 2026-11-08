import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { Badge } from '../ui/StatusBadge'
import Button from '../ui/Button'
import { formatPeso } from '../../lib/format'
import type { TechnicianRow } from '../../api/types'

interface TechnicianTableProps {
  rows: TechnicianRow[]
  onEdit: (t: TechnicianRow) => void
}

export default function TechnicianTable({ rows, onEdit }: TechnicianTableProps) {
  const columns: Column<TechnicianRow>[] = [
    {
      header: 'Technician',
      cell: (t) => (
        <div>
          <p className="font-medium text-slate-900">{t.full_name}</p>
          <p className="text-xs text-slate-500">{t.employee_no}</p>
        </div>
      ),
      csv: (t) => `${t.full_name} (${t.employee_no})`,
    },
    {
      header: 'Type',
      cell: (t) => (
        <div>
          <Badge tone={t.kind === 'Staff' ? 'green' : 'amber'}>{t.kind}</Badge>
          <p className="mt-1 text-xs text-slate-500">{t.kind === 'External' ? t.company : t.team}</p>
        </div>
      ),
      csv: (t) => `${t.kind} - ${t.kind === 'External' ? t.company : t.team}`,
    },
    {
      header: 'Sign-in account',
      cell: (t) =>
        t.kind === 'External' ? (
          <span className="text-xs text-slate-400">Not allowed (external)</span>
        ) : t.username ? (
          <span className="text-slate-700">{t.username}</span>
        ) : (
          <span className="text-xs text-slate-500">No account</span>
        ),
      csv: (t) => t.username,
    },
    { header: 'Rate', cell: (t) => `${formatPeso(t.hourly_rate)} / h`, className: 'text-right', csv: (t) => t.hourly_rate },
    { header: 'Active jobs', cell: (t) => t.active_jobs, className: 'text-right', csv: (t) => t.active_jobs },
    {
      header: 'Status',
      cell: (t) => <Badge tone={t.is_active ? 'green' : 'slate'}>{t.is_active ? 'Available' : 'Inactive'}</Badge>,
      csv: (t) => (t.is_active ? 'Available' : 'Inactive'),
    },
    {
      header: '',
      cell: (t) => (
        <div className="flex justify-end">
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => onEdit(t)}>
            Edit
          </Button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} rows={rows} rowKey={(t) => t.technician_id} empty="No technicians yet." />
}
