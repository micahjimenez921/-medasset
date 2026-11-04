import { Check } from 'lucide-react'
import { Card } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import AlertCard from './AlertCard'
import type { AlertItem } from '../../api/types'

interface AlertListProps {
  alerts: AlertItem[] | null
  loading: boolean
  busyId: number | null
  onAcknowledge: (alert: AlertItem) => void
  onCreateWorkOrder: (alert: AlertItem) => void
}

export default function AlertList({ alerts, loading, busyId, onAcknowledge, onCreateWorkOrder }: AlertListProps) {
  if (loading && !alerts) {
    return (
      <Card className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    )
  }

  if (alerts && alerts.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-12 text-center text-sm text-slate-500">
        <Check className="text-emerald-500" size={32} />
        No alerts here. Everything is on schedule.
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y divide-slate-100">
        {alerts?.map((a) => (
          <AlertCard
            key={a.alert_id}
            alert={a}
            busy={busyId === a.alert_id}
            onAcknowledge={onAcknowledge}
            onCreateWorkOrder={onCreateWorkOrder}
          />
        ))}
      </ul>
    </Card>
  )
}
