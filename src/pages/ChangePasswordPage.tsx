import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/auth-context'
import Button from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/Field'
import { useToast } from '../components/ui/toast-context'

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user === undefined) return null
  if (user === null) return <Navigate to="/login" replace />

  const forced = user.must_change_password

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (next !== repeat) {
      setError('The new passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/change-password/', { current_password: current, new_password: next })
      await refresh()
      toast.success('Password changed.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <KeyRound size={16} /> {forced ? 'Choose a new password' : 'Change password'}
        </h1>
        {forced && (
          <p className="text-sm text-slate-600">
            You signed in with a temporary password. Choose your own before continuing.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Field label={forced ? 'Temporary password' : 'Current password'} required>
          <TextInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="New password" hint="At least 10 characters with an uppercase letter, a lowercase letter and a number." required>
          <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label="Repeat new password" required>
          <TextInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />
        </Field>
        <div className="flex items-center justify-between gap-2">
          {!forced ? (
            <Link to="/" className="text-sm text-slate-600 hover:underline">
              Cancel
            </Link>
          ) : (
            <span />
          )}
          <Button type="submit" loading={busy}>
            Save password
          </Button>
        </div>
      </form>
    </div>
  )
}
