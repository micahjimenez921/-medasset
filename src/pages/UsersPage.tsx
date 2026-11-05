import { useState } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/auth-context'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import ActionModal from '../components/ui/ActionModal'
import UserTable from '../components/users/UserTable'
import UserFormModal from '../components/users/UserFormModal'
import TempPasswordModal from '../components/users/TempPasswordModal'
import type { RoleMatrixData, TemporaryPasswordResult, UserRow } from '../api/types'

type Dialog =
  | { kind: 'form'; user: UserRow | null }
  | { kind: 'reset'; user: UserRow }
  | { kind: 'unlock'; user: UserRow }
  | null

export default function UsersPage() {
  const { user: me } = useAuth()
  const users = useFetch<UserRow[]>('/users/')
  const roles = useFetch<RoleMatrixData>('/roles/')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [temp, setTemp] = useState<TemporaryPasswordResult | null>(null)

  const loadError = users.error && !users.data ? users.error : roles.error && !roles.data ? roles.error : null
  if (loadError) return <ErrorBox message={loadError} onRetry={() => { users.reload(); roles.reload() }} />

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Who can sign in to MedAsset and what they may do. Accounts are deactivated, never deleted, so the audit trail always points to a real person."
        actions={
          <Button onClick={() => setDialog({ kind: 'form', user: null })} disabled={!roles.data}>
            <Plus size={16} />
            Add user
          </Button>
        }
      />

      <Card>
        {!users.data ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <UserTable
            users={users.data}
            selfId={me?.user_id ?? -1}
            onEdit={(u) => setDialog({ kind: 'form', user: u })}
            onReset={(u) => setDialog({ kind: 'reset', user: u })}
            onUnlock={(u) => setDialog({ kind: 'unlock', user: u })}
          />
        )}
      </Card>

      {dialog?.kind === 'form' && roles.data && (
        <UserFormModal
          user={dialog.user}
          roles={roles.data.roles}
          isSelf={dialog.user?.user_id === me?.user_id}
          onClose={() => setDialog(null)}
          onDone={users.reload}
          onTemporaryPassword={setTemp}
        />
      )}

      {dialog?.kind === 'reset' && (
        <ActionModal
          title={`Reset password for ${dialog.user.username}`}
          description="A new temporary password is generated and shown once. The user is signed out everywhere and must choose a new password at the next sign-in."
          submitLabel="Reset password"
          danger
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            const result = await api.post<TemporaryPasswordResult>(`/users/${dialog.user.user_id}/reset-password/`)
            users.reload()
            setTemp(result)
            return 'Password reset.'
          }}
        >
          <p className="text-sm text-slate-700">
            Reset the password of <strong>{dialog.user.full_name}</strong>?
          </p>
        </ActionModal>
      )}

      {dialog?.kind === 'unlock' && (
        <ActionModal
          title={`Unlock ${dialog.user.username}`}
          description="The account was locked after too many wrong passwords."
          submitLabel="Unlock account"
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await api.post(`/users/${dialog.user.user_id}/unlock/`)
            users.reload()
            return 'Account unlocked.'
          }}
        >
          <p className="text-sm text-slate-700">
            Allow <strong>{dialog.user.full_name}</strong> to sign in again?
          </p>
        </ActionModal>
      )}

      {temp && <TempPasswordModal username={temp.username} password={temp.temporary_password} onClose={() => setTemp(null)} />}
    </>
  )
}
