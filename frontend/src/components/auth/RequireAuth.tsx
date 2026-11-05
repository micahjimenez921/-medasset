import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'

/** Wraps every page that needs a signed-in user. */
export default function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>
  }
  if (user === null) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.must_change_password) return <Navigate to="/change-password" replace />
  return <Outlet />
}
