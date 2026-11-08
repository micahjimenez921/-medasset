import { useState } from 'react'
import { api } from '../../api/client'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextInput } from '../ui/Field'
import { EXTERNAL_TEAMS, STAFF_TEAMS } from '../../api/types'
import type { LinkableAccount, TechnicianRow } from '../../api/types'

export type TechnicianDialog =
  | { kind: 'external-new' }
  | { kind: 'staff-new' }
  | { kind: 'edit'; technician: TechnicianRow }

interface TechnicianFormModalProps {
  dialog: TechnicianDialog
  /** Technician-role accounts that have no technician profile yet */
  accounts: LinkableAccount[]
  onClose: () => void
  onDone: () => void
}

/**
 * One form, three jobs:
 *  - add an external technician (contractor / manufacturer engineer, never signs in)
 *  - add the technician profile for an existing Technician account (staff)
 *  - edit rate / contact / activity, and link or unlink a staff account
 */
export default function TechnicianFormModal({ dialog, accounts, onClose, onDone }: TechnicianFormModalProps) {
  const tech = dialog.kind === 'edit' ? dialog.technician : null
  const isExternal = dialog.kind === 'external-new' || tech?.kind === 'External'

  const [employeeNo, setEmployeeNo] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [team, setTeam] = useState<string>(isExternal ? EXTERNAL_TEAMS[0] : STAFF_TEAMS[0])
  const [company, setCompany] = useState(tech?.company ?? '')
  const [specialization, setSpecialization] = useState(tech?.specialization ?? '')
  const [contact, setContact] = useState(tech?.contact_number ?? '')
  const [email, setEmail] = useState(tech?.email ?? '')
  const [rate, setRate] = useState(tech ? String(tech.hourly_rate) : '')
  const [active, setActive] = useState(tech ? !!tech.is_active : true)
  const [userId, setUserId] = useState(String(tech?.user_id ?? accounts[0]?.user_id ?? ''))
  const [linkedId, setLinkedId] = useState(String(tech?.user_id ?? ''))

  const title =
    dialog.kind === 'external-new'
      ? 'Add external technician'
      : dialog.kind === 'staff-new'
        ? 'Add staff technician profile'
        : `Edit ${tech?.full_name}`

  return (
    <ActionModal
      title={title}
      description={
        dialog.kind === 'external-new'
          ? 'Outside technicians never sign in. Hospital staff record their hours and the service report number.'
          : dialog.kind === 'staff-new'
            ? 'Creates the technician profile for an account that already has the Technician role.'
            : undefined
      }
      submitLabel={dialog.kind === 'edit' ? 'Save changes' : 'Add technician'}
      onClose={onClose}
      onSubmit={async () => {
        if (dialog.kind === 'edit' && tech) {
          await api.post(`/technicians/${tech.technician_id}/update/`, {
            specialization: specialization.trim() || null,
            company: isExternal ? company.trim() : null,
            contact_number: contact.trim() || null,
            email: email.trim() || null,
            hourly_rate: Number(rate),
            is_active: active,
            user_id: !isExternal && linkedId ? Number(linkedId) : null,
          })
          onDone()
          return 'Technician updated. Past work orders keep the rate that was saved with them.'
        }
        if (dialog.kind === 'staff-new') {
          await api.post('/technicians/', {
            kind: 'staff',
            user_id: Number(userId),
            employee_no: employeeNo.trim(),
            specialization: specialization.trim() || null,
            team,
            hourly_rate: Number(rate),
          })
          onDone()
          return 'Staff technician profile added.'
        }
        await api.post('/technicians/', {
          kind: 'external',
          employee_no: employeeNo.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          specialization: specialization.trim() || null,
          team,
          company: company.trim(),
          contact_number: contact.trim() || null,
          email: email.trim() || null,
          hourly_rate: Number(rate),
        })
        onDone()
        return 'External technician added.'
      }}
    >
      {dialog.kind === 'staff-new' && (
        <Field label="Account" required hint="Only active Technician accounts without a profile are listed.">
          <SelectInput value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select an account...</option>
            {accounts.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.full_name} ({a.username})
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      {dialog.kind !== 'edit' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Technician number" required>
            <TextInput value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} placeholder={isExternal ? 'e.g. EXT-003' : 'e.g. IFM-002'} required />
          </Field>
          <Field label="Team" required>
            <SelectInput value={team} onChange={(e) => setTeam(e.target.value)} required>
              {(isExternal ? EXTERNAL_TEAMS : STAFF_TEAMS).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      )}

      {dialog.kind === 'external-new' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name" required>
            <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
      )}

      {isExternal && (
        <Field label="Company" required hint="The company that sends this technician.">
          <TextInput value={company} onChange={(e) => setCompany(e.target.value)} required />
        </Field>
      )}

      <Field label="Specialization">
        <TextInput value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
      </Field>

      {isExternal && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact number">
            <TextInput value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Hourly rate (PHP)" required hint="Saved with each assignment, so changing it never rewrites past costs.">
        <TextInput type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
      </Field>

      {dialog.kind === 'edit' && !isExternal && (
        <Field label="Linked sign-in account" hint="Staff technicians can sign in. Choose none to unlink.">
          <SelectInput value={linkedId} onChange={(e) => setLinkedId(e.target.value)}>
            <option value="">No account</option>
            {tech?.user_id && (
              <option value={tech.user_id}>
                {tech.username} (current)
              </option>
            )}
            {accounts.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.full_name} ({a.username})
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      {dialog.kind === 'edit' && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Available for new work orders
        </label>
      )}
    </ActionModal>
  )
}
