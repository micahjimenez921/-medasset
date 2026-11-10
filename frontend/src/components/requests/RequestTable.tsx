import { Link } from 'react-router-dom'
import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'
import { useAuth } from '../../auth/auth-context'
import { formatDate } from '../../lib/format'
import type { ServiceRequest } from '../../api/types'

interface RequestTableProps {
  requests: ServiceRequest[]
  onReview: (request: ServiceRequest) => void
}

/** Service requests. Reviewers see everyone's; a technician sees only their own. */
export default function RequestTable({ requests, onReview }: RequestTableProps) {
  const { can } = useAuth()
  const reviewer = can('request.review')
  const seesWorkOrders = can('workorder.view_all')

  const columns: Column<ServiceRequest>[] = [
    { header: 'Request', cell: (r) => <span className="font-medium text-slate-900">{r.request_number}</span>, csv: (r) => r.request_number },
    {
      header: 'Asset',
      cell: (r) => (
        <div>
          <Link to={`/assets/${r.asset_id}`} className="font-medium text-teal-700 hover:underline">
            {r.asset_tag}
          </Link>
          <p className="text-xs text-slate-500">{r.asset_name} · {r.department}</p>
        </div>
      ),
      csv: (r) => `${r.asset_tag} ${r.asset_name}`,
    },
    {
      header: 'Problem',
      cell: (r) => <p className="max-w-72 text-sm text-slate-700">{r.description}</p>,
      csv: (r) => r.description,
    },
    { header: 'Priority', cell: (r) => <StatusBadge value={r.priority} />, csv: (r) => r.priority },
    ...(reviewer
      ? [{ header: 'Reported by', cell: (r: ServiceRequest) => r.reporter_name, csv: (r: ServiceRequest) => r.reporter_name }]
      : []),
    { header: 'Reported', cell: (r) => formatDate(r.reported_at), csv: (r) => r.reported_at },
    { header: 'Status', cell: (r) => <StatusBadge value={r.status} />, csv: (r) => r.status },
    {
      header: 'Outcome',
      cell: (r) => (
        <div className="max-w-56 text-sm">
          {r.wo_number &&
            (seesWorkOrders ? (
              <Link to={`/work-orders/${r.work_order_id}`} className="font-medium text-teal-700 hover:underline">
                {r.wo_number}
              </Link>
            ) : (
              <span className="font-medium text-slate-900">{r.wo_number}</span>
            ))}
          {r.review_note && <p className="text-xs text-slate-500">{r.review_note}</p>}
          {!r.wo_number && !r.review_note && <span className="text-slate-300">Waiting for review</span>}
        </div>
      ),
      csv: (r) => [r.wo_number, r.review_note].filter(Boolean).join(' - '),
    },
    ...(reviewer
      ? [
          {
            header: 'Action',
            cell: (r: ServiceRequest) =>
              r.status === 'Pending' ? (
                <Button variant="secondary" onClick={() => onReview(r)}>
                  Review
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <DataTable
      columns={columns}
      rows={requests}
      rowKey={(r) => r.request_id}
      pageSize={10}
      exportName="medasset-service-requests"
      empty="No service requests here."
    />
  )
}
