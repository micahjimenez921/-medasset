import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
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
    <div
      className="relative flex min-h-screen items-center justify-center bg-teal-900 bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/login-bg.svg')" }}
    >
      {/* green tint so the form stays easy to read on top of the picture */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-950/70 via-teal-900/40 to-teal-950/75" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <img
            src="/tdh-logo.png"
            alt="Tuburan District Hospital seal"
            className="mx-auto h-24 w-24 rounded-full bg-white p-1 shadow-lg ring-4 ring-gold-500"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight drop-shadow">Tuburan District Hospital</h1>
          <p className="mt-1 text-sm text-teal-100 drop-shadow">MedAsset · Medical asset tracking and preventive service</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Lock size={16} /> Sign in
          </h2>
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

        <p className="mt-4 text-center text-xs text-teal-100 drop-shadow">
          Authorized hospital staff only. Sign-ins and actions are recorded.
        </p>
      </div>
    </div>
  )
}
