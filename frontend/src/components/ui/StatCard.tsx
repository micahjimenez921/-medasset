import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'
import Skeleton from './Skeleton'

type Tone = 'teal' | 'amber' | 'red' | 'sky'

const iconTones: Record<Tone, string> = {
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  sky: 'bg-sky-50 text-sky-700',
}

interface StatCardProps {
  label: string
  value: string | number | undefined
  icon: LucideIcon
  tone?: Tone
  hint?: string
  loading?: boolean
}

export default function StatCard({ label, value, icon: Icon, tone = 'teal', hint, loading }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          {loading || value === undefined ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 truncate text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
        </div>
        <span className={`rounded-lg p-2.5 ${iconTones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}
