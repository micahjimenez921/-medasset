import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import FilterChips from '../components/ui/FilterChips'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import ScheduleTable from '../components/schedules/ScheduleTable'
import ScheduleFormModal from '../components/schedules/ScheduleFormModal'
import type { ScheduleStatus } from '../api/types'
import Can from '../components/auth/Can'

const STATE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Due Soon', label: 'Due soon' },
  { value: 'OK', label: 'On track' },
]

export default function SchedulesPage() {
  const [params, setParams] = useSearchParams()
  const state = params.get('state') ?? 'all'
  const [showForm, setShowForm] = useState(false)

  const schedules = useFetch<ScheduleStatus[]>(
    state === 'all' ? '/schedules/' : `/schedules/?state=${encodeURIComponent(state)}`,
  )

  function changeState(value: string) {
    setParams(value === 'all' ? {} : { state: value }, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Maintenance schedules"
        subtitle="Calendar-based and runtime-based preventive maintenance for every asset"
        actions={
          <Can permission="schedule.manage">
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              New schedule
            </Button>
          </Can>
        }
      />

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <FilterChips options={STATE_OPTIONS} value={state} onChange={changeState} />
        </div>

        {schedules.error && !schedules.data && (
          <div className="p-4">
            <ErrorBox message={schedules.error} onRetry={schedules.reload} />
          </div>
        )}
        {schedules.loading && !schedules.data && (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {schedules.data && <ScheduleTable schedules={schedules.data} onChanged={schedules.reload} />}
      </Card>

      {showForm && <ScheduleFormModal onClose={() => setShowForm(false)} onDone={schedules.reload} />}
    </>
  )
}
