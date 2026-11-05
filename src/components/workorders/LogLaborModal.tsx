import { useState } from 'react'
import { api } from '../../api/client'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextInput } from '../ui/Field'
import type { LaborLine } from '../../api/types'

interface LogLaborModalProps {
  workOrderId: number
  /** the technicians assigned to this work order */
  labor: LaborLine[]
  onClose: () => void
  onDone: () => void
}

/** Adds worked hours for an assigned technician (sp_log_labor_hours). */
export default function LogLaborModal({ workOrderId, labor, onClose, onDone }: LogLaborModalProps) {
  const [technicianId, setTechnicianId] = useState(labor[0] ? String(labor[0].technician_id) : '')
  const [hours, setHours] = useState('')

  return (
    <ActionModal
      title="Log labor hours"
      description="Hours are added to what the technician has already logged on this work order."
      submitLabel="Log hours"
      onClose={onClose}
      onSubmit={async () => {
        await api.post(`/work-orders/${workOrderId}/labor/`, {
          technician_id: Number(technicianId),
          hours: Number(hours),
        })
        onDone()
        return `${hours} hour(s) logged.`
      }}
    >
      <Field label="Technician" required>
        <SelectInput required value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
          {labor.map((l) => (
            <option key={l.technician_id} value={l.technician_id}>
              {l.technician} ({l.hours_worked} h so far)
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Hours worked" required>
        <TextInput type="number" min="0.25" step="0.25" required value={hours} onChange={(e) => setHours(e.target.value)} />
      </Field>
    </ActionModal>
  )
}
