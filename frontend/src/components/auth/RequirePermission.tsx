import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../../auth/auth-context'

/** Page-level guard: shows "no access" instead of the page when the role lacks the permission. */
export default function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can, user } = useAuth()
  if (can(permission)) return <>{children}</>
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <ShieldAlert className="mx-auto text-amber-500" size={36} />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">You do not have access to this page</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your role ({user?.role}) does not include this permission. Ask an administrator if you need it.
      </p>
    </div>
  )
}
