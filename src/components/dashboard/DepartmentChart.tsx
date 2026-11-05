import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import type { DepartmentCount } from '../../api/types'

interface DepartmentChartProps {
  rows: DepartmentCount[] | undefined
  loading: boolean
}

/** Active assets per department, with the number currently in repair. */
export default function DepartmentChart({ rows, loading }: DepartmentChartProps) {
  const data = (rows ?? [])
    .filter((r) => r.assets > 0)
    .map((r) => ({
      department: r.department,
      healthy: r.assets - (r.in_repair ?? 0),
      repair: r.in_repair ?? 0,
    }))

  return (
    <Card>
      <CardHeader title="Assets by department" subtitle="Where the equipment is right now" />
      <div className="h-72 p-4">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="department"
                width={130}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#475569' }}
              />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="healthy" name="In use" stackId="a" fill="#0f766e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="repair" name="In repair" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
