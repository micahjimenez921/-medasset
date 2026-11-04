import { Search } from 'lucide-react'
import { SelectInput } from '../ui/Field'
import type { DepartmentOption } from '../../api/types'

const STATUSES = ['', 'In-Use', 'Repair', 'Decommissioned']

interface AssetFiltersProps {
  text: string
  onText: (value: string) => void
  status: string
  onStatus: (value: string) => void
  department: string
  onDepartment: (value: string) => void
  departments: DepartmentOption[]
}

/** Search box, status chips and department dropdown for the asset list. */
export default function AssetFilters({
  text,
  onText,
  status,
  onStatus,
  department,
  onDepartment,
  departments,
}: AssetFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
      <div className="relative min-w-56 flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Search tag, serial, model or category..."
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => onStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <SelectInput value={department} onChange={(e) => onDepartment(e.target.value)} className="w-auto">
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.department_id} value={d.department_id}>
            {d.name}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}
