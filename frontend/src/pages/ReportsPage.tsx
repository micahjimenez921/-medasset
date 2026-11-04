import { useSearchParams } from 'react-router-dom'
import { ClipboardCheck, Printer, ShieldCheck, Wallet, Wrench } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import StatCard from '../components/ui/StatCard'
import { Card, CardHeader } from '../components/ui/Card'
import { SelectInput } from '../components/ui/Field'
import CostChart from '../components/dashboard/CostChart'
import StackedCostChart from '../components/reports/StackedCostChart'
import PreventiveSplitChart from '../components/reports/PreventiveSplitChart'
import CostBreakdownTable from '../components/reports/CostBreakdownTable'
import TopAssetsTable from '../components/reports/TopAssetsTable'
import { formatNumber, formatPeso } from '../lib/format'
import type { CostReport } from '../api/types'

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const thisYear = new Date().getFullYear()
  const year = params.get('year') ?? String(thisYear)
  const years = [thisYear, thisYear - 1, thisYear - 2]

  const report = useFetch<CostReport>(`/reports/costs/?year=${encodeURIComponent(year)}`)
  const data = report.data
  const loading = report.loading && !data

  const totalCost = (data?.by_department ?? []).reduce((sum, r) => sum + r.total_cost, 0)
  const totalOrders = (data?.by_department ?? []).reduce((sum, r) => sum + r.work_orders, 0)
  const preventiveCost = data?.by_type.find((t) => t.kind === 'Preventive')?.total_cost ?? 0

  if (report.error && !data) {
    return <ErrorBox message={report.error} onRetry={report.reload} />
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Maintenance spending for ${year}, from completed work orders`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <SelectInput
              value={year}
              onChange={(e) => setParams(e.target.value === String(thisYear) ? {} : { year: e.target.value }, { replace: true })}
              className="w-auto"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectInput>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total maintenance cost" value={data && formatPeso(totalCost)} icon={Wallet} loading={loading} />
        <StatCard label="Completed work orders" value={data && formatNumber(totalOrders)} icon={ClipboardCheck} tone="sky" loading={loading} />
        <StatCard
          label="Average cost per work order"
          value={data && formatPeso(totalOrders > 0 ? totalCost / totalOrders : 0)}
          icon={Wrench}
          tone="amber"
          loading={loading}
        />
        <StatCard
          label="Spent on preventive work"
          value={data && `${totalCost > 0 ? Math.round((preventiveCost / totalCost) * 100) : 0}%`}
          icon={ShieldCheck}
          hint="The higher, the fewer emergency repairs"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CostChart byMonth={data?.by_month} loading={loading} subtitle={`Labor and parts on completed work orders in ${year}`} />
        </div>
        <PreventiveSplitChart rows={data?.by_type ?? []} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <StackedCostChart
          title="Cost by department"
          subtitle="Labor and parts, per department"
          rows={(data?.by_department ?? []).map((r) => ({ name: r.department, labor: r.labor_cost, parts: r.parts_cost }))}
          loading={loading}
        />
        <StackedCostChart
          title="Cost by equipment category"
          subtitle="Labor and parts, per type of device"
          rows={(data?.by_category ?? []).map((r) => ({ name: r.category, labor: r.labor_cost, parts: r.parts_cost }))}
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Cost by department" subtitle="Table view, with export" />
          <CostBreakdownTable
            label="Department"
            exportName="medasset-cost-by-department"
            rows={(data?.by_department ?? []).map((r) => ({ ...r, name: r.department }))}
          />
        </Card>
        <Card>
          <CardHeader title="Most expensive assets to maintain" subtitle="Candidates for replacement" />
          <TopAssetsTable rows={data?.top_assets ?? []} />
        </Card>
      </div>
    </>
  )
}
