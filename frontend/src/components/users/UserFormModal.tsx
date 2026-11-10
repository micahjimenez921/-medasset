import { useState } from 'react'
import { api } from '../../api/client'
import { STAFF_TEAMS } from '../../api/types'
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
  const [roleId, setRoleId] = useState(String(user?.role_id ?? roles.find((r) => r.name === 'Management')?.role_id ?? ''))
  const [active, setActive] = useState(user ? !!user.is_active : true)
  // technician profile (only when creating an account with the Technician role)
  const [employeeNo, setEmployeeNo] = useState('')
  const [team, setTeam] = useState<string>(STAFF_TEAMS[0])
  const [specialization, setSpecialization] = useState('')
  const [rate, setRate] = useState('')
  const isTechnician = !user && roles.find((r) => String(r.role_id) === roleId)?.name === 'Technician'

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
          ...(isTechnician
            ? {
                employee_no: employeeNo.trim(),
                team,
                specialization: specialization.trim() || null,
                hourly_rate: rate === '' ? null : Number(rate),
              }
            : {}),
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
      <Field
        label="Role"
        hint={isSelf ? 'You cannot change your own role.' : roles.find((r) => String(r.role_id) === roleId)?.description}
        required
      >
        <SelectInput value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={isSelf} required>
          {roles.map((r) => (
            <option key={r.role_id} value={r.role_id}>
              {r.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      {isTechnician && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            A staff technician can sign in and is also added to the list of technicians that work orders can be assigned to.
            Use their first and last name above.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Technician number" required>
              <TextInput value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} placeholder="e.g. IFM-002" required />
            </Field>
            <Field label="Team" required>
              <SelectInput value={team} onChange={(e) => setTeam(e.target.value)} required>
                {STAFF_TEAMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Specialization">
              <TextInput value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </Field>
            <Field label="Hourly rate (PHP)" required>
              <TextInput type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
            </Field>
          </div>
        </div>
      )}
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
