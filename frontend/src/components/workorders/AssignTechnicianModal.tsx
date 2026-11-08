import { useState } from 'react'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput } from '../ui/Field'
import { formatPeso } from '../../lib/format'
import type { TechnicianOption } from '../../api/types'

interface AssignTechnicianModalProps {
  workOrderId: number
  /** technicians already on this work order are left out of the list */
  assignedIds: number[]
  onClose: () => void
  onDone: () => void
}

/** Assigns a technician (sp_assign_technician). The first assignment moves the work order to "Assigned". */
export default function AssignTechnicianModal({ workOrderId, assignedIds, onClose, onDone }: AssignTechnicianModalProps) {
  const technicians = useFetch<TechnicianOption[]>('/lookups/technicians/')
  const [technicianId, setTechnicianId] = useState('')
  const [role, setRole] = useState(assignedIds.length === 0 ? 'Lead' : 'Assistant')

  const available = (technicians.data ?? []).filter((t) => t.is_active && !assignedIds.includes(t.technician_id))
  const staff = available.filter((t) => t.kind === 'Staff')
  const external = available.filter((t) => t.kind === 'External')

  return (
    <ActionModal
      title="Assign technician"
      submitLabel="Assign"
      onClose={onClose}
      onSubmit={async () => {
        await api.post(`/work-orders/${workOrderId}/assign/`, { technician_id: Number(technicianId), role })
        onDone()
        return 'Technician assigned. Their hourly rate was saved with the assignment.'
      }}
    >
      <Field label="Technician" required>
        <SelectInput required value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
          <option value="">Select a technician...</option>
          <optgroup label="Staff technicians">
            {staff.map((t) => (
              <option key={t.technician_id} value={t.technician_id}>
                {t.full_name} ({t.team}) · {formatPeso(t.hourly_rate)}/h
              </option>
            ))}
          </optgroup>
          <optgroup label="External technicians">
            {external.map((t) => (
              <option key={t.technician_id} value={t.technician_id}>
                {t.full_name} · {t.company} · {formatPeso(t.hourly_rate)}/h
              </option>
            ))}
          </optgroup>
        </SelectInput>
      </Field>

      <Field label="Role" required>
        <SelectInput value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Lead</option>
          <option>Assistant</option>
        </SelectInput>
      </Field>
    </ActionModal>
  )
}
