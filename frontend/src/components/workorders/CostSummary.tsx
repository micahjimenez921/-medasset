import { Card, CardHeader } from '../ui/Card'
import { formatPeso } from '../../lib/format'

interface CostSummaryProps {
  labor: number
  parts: number
  total: number
}

/** Labor + parts = total. The numbers are computed by stored functions in the database. */
export default function CostSummary({ labor, parts, total }: CostSummaryProps) {
  return (
    <Card>
      <CardHeader title="Cost" />
      <dl className="space-y-3 p-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Labor</dt>
          <dd className="font-medium text-slate-900">{formatPeso(labor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Parts</dt>
          <dd className="font-medium text-slate-900">{formatPeso(parts)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3">
          <dt className="font-semibold text-slate-900">Total</dt>
          <dd className="text-lg font-bold text-teal-700">{formatPeso(total)}</dd>
        </div>
      </dl>
      <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
        Hourly rates and part prices are saved when they are used, so later price changes never rewrite past costs.
      </p>
    </Card>
  )
}
