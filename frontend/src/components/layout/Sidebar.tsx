import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BellRing,
  CalendarClock,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Package,
  ScrollText,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react'
import { useAuth } from '../../auth/auth-context'
import { useFetch } from '../../hooks/useFetch'
import type { ServiceRequest } from '../../api/types'

// `permission` = the menu item is hidden for roles that do not have it
const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard.view' },
  { to: '/assets', label: 'Assets', icon: Package, end: false, permission: 'asset.view' },
  { to: '/work-orders', label: 'Work orders', icon: ClipboardList, end: false, permission: 'workorder.view' },
  { to: '/requests', label: 'Service requests', icon: Inbox, end: false, permission: 'request.view' },
  { to: '/alerts', label: 'Alerts', icon: BellRing, end: false, permission: 'alert.view' },
  { to: '/schedules', label: 'Schedules', icon: CalendarClock, end: false, permission: 'schedule.view' },
  { to: '/reports', label: 'Reports', icon: TrendingUp, end: false, permission: 'report.view' },
  { to: '/audit-log', label: 'Audit log', icon: ScrollText, end: false, permission: 'audit.view' },
  { to: '/users', label: 'Users', icon: Users, end: false, permission: 'user.manage' },
  { to: '/technicians', label: 'Technicians', icon: UserCog, end: false, permission: 'technician.manage' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { can } = useAuth()
  // reviewers see how many reports are waiting; refreshed after every change made in the app
  const pending = useFetch<ServiceRequest[]>(can('request.review') ? '/requests/?status=Active' : null)
  const reloadPending = pending.reload
  useEffect(() => {
    window.addEventListener('medasset:data-changed', reloadPending)
    return () => window.removeEventListener('medasset:data-changed', reloadPending)
  }, [reloadPending])
  const pendingCount = pending.data?.length ?? 0
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-teal-900 text-teal-50 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <img
            src="/tdh-logo.png"
            onError={(e) => {
              // fall back to a .jpg copy of the seal if the .png is missing
              e.currentTarget.onerror = null
              e.currentTarget.src = '/tdhlogo.jpg'
            }}
            alt="Tuburan District Hospital seal"
            className="h-11 w-11 shrink-0 rounded-full bg-white p-0.5 ring-2 ring-gold-500" />
          <div>
            <p className="text-lg font-bold leading-tight">MedAsset</p>
            <p className="text-[11px] leading-tight text-gold-300">Tuburan District Hospital</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {links.filter((l) => can(l.permission)).map(({ to, label, icon: Icon, end }) => (
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
              {to === '/work-orders' && !can('workorder.view_all')
                ? 'My work orders'
                : to === '/requests' && !can('request.review')
                  ? 'My reports'
                  : label}
              {to === '/requests' && pendingCount > 0 && (
                <span className="ml-auto rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold text-teal-900">
                  {pendingCount}
                </span>
              )}
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
