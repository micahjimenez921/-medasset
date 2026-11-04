import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import StatusBadge from '../ui/StatusBadge'
import { formatDateTime } from '../../lib/format'
import type { JobLogEntry } from '../../api/types'

const JOB_LABELS: Record<string, string> = {
  preventive_check: 'Preventive maintenance check',
}

const columns: Column<JobLogEntry>[] = [
  { header: 'Ran at', cell: (j) => formatDateTime(j.ran_at), csv: (j) => j.ran_at },
  {
    header: 'Job',
    cell: (j) => <span className="font-medium text-slate-900">{JOB_LABELS[j.job_name] ?? j.job_name}</span>,
    csv: (j) => JOB_LABELS[j.job_name] ?? j.job_name,
  },
  {
    header: 'Started by',
    cell: (j) => (
      <div className="flex items-center gap-2">
        <StatusBadge value={j.triggered_by} />
        <span className="text-xs text-slate-500">
          {j.triggered_by === 'EVENT' ? 'database scheduler' : 'a user clicked Run check'}
        </span>
      </div>
    ),
    csv: (j) => j.triggered_by,
  },
  { header: 'New alerts', cell: (j) => j.alerts_created, csv: (j) => j.alerts_created, className: 'text-right' },
]

export default function JobLogTable({ jobs }: { jobs: JobLogEntry[] }) {
  return (
    <DataTable
      columns={columns}
      rows={jobs}
      rowKey={(j) => j.job_log_id}
      pageSize={10}
      exportName="medasset-job-log"
      empty="The job has not run yet."
    />
  )
}
