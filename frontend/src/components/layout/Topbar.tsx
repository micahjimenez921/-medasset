import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, Menu, Search } from 'lucide-react'
import { useFetch } from '../../hooks/useFetch'
import type { DashboardData } from '../../api/types'

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data, reload } = useFetch<DashboardData>('/dashboard/')

  // refresh the alert count after any change made anywhere in the app
  useEffect(() => {
    window.addEventListener('medasset:data-changed', reload)
    return () => window.removeEventListener('medasset:data-changed', reload)
  }, [reload])

  function search(e: FormEvent) {
    e.preventDefault()
    navigate(query.trim() ? `/assets?search=${encodeURIComponent(query.trim())}` : '/assets')
  }

  const openAlerts = data?.summary.open_alerts ?? 0
  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <header className="print:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <form onSubmit={search} className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets by tag, serial or model..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
          <CalendarDays size={16} />
          {today}
        </span>

        <Link
          to="/alerts"
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label={`${openAlerts} open alerts`}
        >
          <Bell size={20} />
          {openAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {openAlerts}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
