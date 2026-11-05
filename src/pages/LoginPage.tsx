import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { HeartPulse, Lock } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../api/client'
import Button from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Field'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="rounded-lg bg-teal-700 p-2 text-white">
            <HeartPulse size={24} />
          </span>
          <div>
            <p className="text-xl font-bold leading-tight text-slate-900">MedAsset</p>
            <p className="text-xs text-slate-500">Medical asset tracking and preventive service</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Lock size={16} /> Sign in
          </h1>
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Field label="Username" required>
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Authorized hospital staff only. Sign-ins and actions are recorded.
        </p>
      </div>
    </div>
  )
}
