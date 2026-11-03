import { NavLink } from 'react-router-dom'
import {
  BellRing,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Package,
  ScrollText,
  TrendingUp,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Package, end: false },
  { to: '/work-orders', label: 'Work orders', icon: ClipboardList, end: false },
  { to: '/alerts', label: 'Alerts', icon: BellRing, end: false },
  { to: '/schedules', label: 'Schedules', icon: CalendarClock, end: false },
  { to: '/reports', label: 'Reports', icon: TrendingUp, end: false },
  { to: '/audit-log', label: 'Audit log', icon: ScrollText, end: false },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-teal-900 text-teal-50 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="rounded-lg bg-teal-700 p-2">
            <HeartPulse size={22} />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">MedAsset</p>
            <p className="text-[11px] leading-tight text-teal-200">Biomedical engineering</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-teal-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 rounded-lg bg-teal-800/70 p-3 text-xs text-teal-100">
          <p className="font-semibold text-white">Automated checks</p>
          <p className="mt-1 leading-relaxed">
            The database scans every schedule daily at 06:00 and raises maintenance alerts by itself.
          </p>
        </div>
      </aside>
    </>
  )
}
