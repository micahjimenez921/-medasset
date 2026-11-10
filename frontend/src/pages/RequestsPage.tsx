import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../auth/auth-context'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import FilterChips from '../components/ui/FilterChips'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import RequestTable from '../components/requests/RequestTable'
import ReportFaultModal from '../components/requests/ReportFaultModal'
import ReviewRequestModal from '../components/requests/ReviewRequestModal'
import Can from '../components/auth/Can'
import type { ServiceRequest } from '../api/types'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Waiting for review' },
  { value: 'all', label: 'All' },
  { value: 'Converted', label: 'Work order created' },
  { value: 'Linked', label: 'Linked' },
  { value: 'Rejected', label: 'Rejected' },
]

export default function RequestsPage() {
  const [params, setParams] = useSearchParams()
  const { can } = useAuth()
  const reviewer = can('request.review')
  const status = params.get('status') ?? 'Active'
  const requests = useFetch<ServiceRequest[]>(status === 'all' ? '/requests/' : `/requests/?status=${encodeURIComponent(status)}`)
  const [reporting, setReporting] = useState(false)
  const [reviewing, setReviewing] = useState<ServiceRequest | null>(null)

  function changeStatus(value: string) {
    setParams(value === 'Active' ? {} : { status: value }, { replace: true })
  }

  return (
    <>
      <PageHeader
        title={reviewer ? 'Service requests' : 'My reports'}
        subtitle={
          reviewer
            ? 'Faults reported by technicians. Review each one: open a work order, link it to an open one, or reject it.'
            : 'The faults you reported, and what the administrator decided'
        }
        actions={
          <Can permission="request.create">
            <Button onClick={() => setReporting(true)}>
              <Megaphone size={16} />
              Report a fault
            </Button>
          </Can>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <FilterChips options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
        </div>
        {requests.error && !requests.data && (
          <div className="p-4">
            <ErrorBox message={requests.error} onRetry={requests.reload} />
          </div>
        )}
        {requests.loading && !requests.data && (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {requests.data && <RequestTable requests={requests.data} onReview={setReviewing} />}
      </Card>

      {reporting && <ReportFaultModal onClose={() => setReporting(false)} onDone={requests.reload} />}
      {reviewing && (
        <ReviewRequestModal request={reviewing} onClose={() => setReviewing(null)} onDone={requests.reload} />
      )}
    </>
  )
}
