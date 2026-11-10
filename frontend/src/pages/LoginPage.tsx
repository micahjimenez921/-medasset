import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../api/client'
import Button from '../components/ui/Button'

// One style for both boxes, so they always line up exactly.
const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  // always start from the home page: the previous user's last page may be forbidden for this role
  const from = '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to={user.must_change_password ? '/change-password' : from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const me = await login(username.trim(), password)
      navigate(me.must_change_password ? '/change-password' : from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-100 to-teal-100 p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:grid-cols-2">
        {/* ---------- LEFT: the photo is layered with a green fade, so it melts into the welcome area ---------- */}
        <aside
          className="relative hidden md:block"
          style={{
            minHeight: 620,
            backgroundColor: '#0a3d2e',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%, auto 72%',
            backgroundPosition: '0 0, center top',
            backgroundImage:
              "linear-gradient(to bottom, rgba(10,61,46,0.30) 0%, rgba(10,61,46,0.45) 35%, rgba(10,61,46,0.88) 58%, #0a3d2e 70%), url('/hospital.jpg')",
          }}
        >
          <div className="absolute inset-x-0 bottom-0 p-9 text-white">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: '#e5a40f', color: '#04241b' }}
            >
              Tuburan District Hospital
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-tight">Welcome to MedAsset</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#d2eee0' }}>
              Track every medical device, keep preventive maintenance on schedule, and keep a complete audit trail of
              who did what.
            </p>
          </div>
        </aside>

        {/* ---------- RIGHT: sign-in form ---------- */}
        <main className="flex items-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex items-center gap-3">
              <img
                src="/tdh-logo.png"
                onError={(e) => {
                  // fall back to a .jpg copy of the seal if the .png is missing
                  e.currentTarget.onerror = null
                  e.currentTarget.src = '/tdhlogo.jpg'
                }}
                alt="Tuburan District Hospital seal"
                className="h-16 w-16 shrink-0 rounded-full"
                style={{ boxShadow: '0 0 0 2px #e5a40f' }}
              />
              <div>
                <p className="text-2xl font-bold leading-tight" style={{ color: '#0c4a37' }}>
                  MedAsset
                </p>
                <p className="text-sm font-semibold leading-tight text-slate-800">Tuburan District Hospital</p>
                <p className="text-xs leading-tight text-slate-500">Medical asset tracking and preventive service</p>
              </div>
            </div>

            <h1 className="mt-8 text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-600">Enter your credentials to access your account.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                  Username
                </label>
                <input
                  id="username"
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className={`${inputClass} pr-11`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button type="submit" loading={busy} className="w-full">
                Sign in
              </Button>
            </form>

            <p className="mt-6 flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2.5 text-xs leading-relaxed text-teal-900">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal-700" />
              Authorized hospital staff only. Sign-ins and actions are recorded. Forgot your password? Ask an
              administrator to reset it.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
