import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { formatPeso } from '../../lib/format'
import type { CostReport } from '../../api/types'

const COLORS: Record<string, string> = {
  Preventive: '#0f766e',
  Corrective: '#f59e0b',
}

interface PreventiveSplitChartProps {
  rows: CostReport['by_type']
  loading: boolean
}

/** Planned (preventive) versus emergency (corrective) spending - the whole point of preventive maintenance. */
export default function PreventiveSplitChart({ rows, loading }: PreventiveSplitChartProps) {
  const data = rows.map((r) => ({ name: r.kind, value: r.total_cost, count: r.work_orders }))
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const preventive = data.find((d) => d.name === 'Preventive')?.value ?? 0

  return (
    <Card>
      <CardHeader title="Preventive vs corrective" subtitle="Share of the cost spent on planned work" />
      <div className="h-72 p-4">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">No completed work for this year.</p>
        ) : (
          <div className="relative h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [formatPeso(Number(value)), String(name)]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
              <p className="text-2xl font-bold text-slate-900">{total > 0 ? Math.round((preventive / total) * 100) : 0}%</p>
              <p className="text-xs text-slate-500">preventive</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
