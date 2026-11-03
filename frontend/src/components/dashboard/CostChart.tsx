import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { formatPeso } from '../../lib/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface CostChartProps {
  byMonth: { month_no: number; total_cost: number }[] | undefined
  loading: boolean
}

/** Completed-work cost per month (labor + parts), from sp_report_costs. */
export default function CostChart({ byMonth, loading }: CostChartProps) {
  const data = MONTHS.map((month, i) => ({
    month,
    cost: byMonth?.find((row) => row.month_no === i + 1)?.total_cost ?? 0,
  }))

  return (
    <Card>
      <CardHeader title="Maintenance cost" subtitle="Labor and parts on completed work orders, this year" />
      <div className="h-72 p-4">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(v) => (Number(v) >= 1000 ? `${Number(v) / 1000}k` : String(v))}
              />
              <Tooltip formatter={(value) => [formatPeso(Number(value)), 'Cost']} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#0f766e"
                strokeWidth={2.5}
                fill="url(#costFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
