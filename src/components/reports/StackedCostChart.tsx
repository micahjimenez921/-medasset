import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import { formatPeso } from '../../lib/format'

interface Row {
  name: string
  labor: number
  parts: number
}

interface StackedCostChartProps {
  title: string
  subtitle: string
  rows: Row[]
  loading: boolean
}

/** Horizontal bars of cost per group, split into labor and parts. */
export default function StackedCostChart({ title, subtitle, rows, loading }: StackedCostChartProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="h-72 p-4">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : rows.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">No completed work for this year.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(v) => (Number(v) >= 1000 ? `${Number(v) / 1000}k` : String(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#475569' }}
              />
              <Tooltip formatter={(value, name) => [formatPeso(Number(value)), String(name)]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="labor" name="Labor" stackId="cost" fill="#0f766e" />
              <Bar dataKey="parts" name="Parts" stackId="cost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
