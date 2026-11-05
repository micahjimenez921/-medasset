import { useState } from 'react'
import { api } from '../../api/client'
import type { RoleInfo, TemporaryPasswordResult, UserRow } from '../../api/types'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextInput } from '../ui/Field'

interface UserFormModalProps {
  /** null = create a new user */
  user: UserRow | null
  roles: RoleInfo[]
  /** true when this row is the signed-in user (cannot change own role or deactivate) */
  isSelf: boolean
  onClose: () => void
  onDone: () => void
  onTemporaryPassword: (result: TemporaryPasswordResult) => void
}

export default function UserFormModal({ user, roles, isSelf, onClose, onDone, onTemporaryPassword }: UserFormModalProps) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [roleId, setRoleId] = useState(String(user?.role_id ?? roles.find((r) => r.name === 'Viewer')?.role_id ?? ''))
  const [active, setActive] = useState(user ? !!user.is_active : true)

  return (
    <ActionModal
      title={user ? `Edit ${user.username}` : 'Add user'}
      description={user ? undefined : 'A temporary password is generated for the new user and shown once.'}
      submitLabel={user ? 'Save changes' : 'Create user'}
      onClose={onClose}
      onSubmit={async () => {
        if (user) {
          await api.post(`/users/${user.user_id}/update/`, {
            full_name: fullName.trim(),
            email: email.trim() || null,
            role_id: Number(roleId),
            is_active: active,
          })
          onDone()
          return 'User updated.'
        }
        const created = await api.post<TemporaryPasswordResult>('/users/', {
          username: username.trim(),
          full_name: fullName.trim(),
          email: email.trim() || null,
          role_id: Number(roleId),
        })
        onDone()
        onTemporaryPassword(created)
        return `User ${created.username} created.`
      }}
    >
      {!user && (
        <Field label="Username" hint="Letters, numbers, dot, dash or underscore. Cannot be changed later." required>
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" required />
        </Field>
      )}
      <Field label="Full name" required>
        <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : undefined} required>
        <SelectInput value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={isSelf} required>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.name} - {r.description}
            </option>
          ))}
        </SelectInput>
      </Field>
      {user && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} disabled={isSelf} onChange={(e) => setActive(e.target.checked)} />
          Account is active
          {isSelf && <span className="text-xs text-slate-500">(you cannot deactivate yourself)</span>}
        </label>
      )}
    </ActionModal>
  )
}
