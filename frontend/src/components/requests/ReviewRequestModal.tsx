import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextArea } from '../ui/Field'
import type { MaintenanceTypeOption, ServiceRequest, WorkOrderSummary } from '../../api/types'

interface ReviewRequestModalProps {
  request: ServiceRequest
  onClose: () => void
  onDone: () => void
}

type Decision = 'convert' | 'link' | 'reject'
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const OPEN = ['Open', 'Assigned', 'In Progress']

/** The administrator reviews a request: open a work order, link it to one that is already open, or reject it. */
export default function ReviewRequestModal({ request, onClose, onDone }: ReviewRequestModalProps) {
  const navigate = useNavigate()
  const [decision, setDecision] = useState<Decision>('convert')
  const types = useFetch<MaintenanceTypeOption[]>('/lookups/maintenance_types/')
  const sameAsset = useFetch<WorkOrderSummary[]>(decision === 'link' ? `/work-orders/?asset_id=${request.asset_id}` : null)

  const [typeId, setTypeId] = useState('')
  const [priority, setPriority] = useState<string>(request.priority)
  const [workOrderId, setWorkOrderId] = useState('')
  const [note, setNote] = useState('')

  const openOrders = (sameAsset.data ?? []).filter((w) => OPEN.includes(w.status))

  return (
    <ActionModal
      title={`Review ${request.request_number}`}
      description={`${request.asset_tag} · reported by ${request.reporter_name}: ${request.description}`}
      submitLabel={decision === 'convert' ? 'Create work order' : decision === 'link' ? 'Link request' : 'Reject request'}
      danger={decision === 'reject'}
      size="lg"
      onClose={onClose}
      onSubmit={async () => {
        if (decision === 'convert') {
          const done = await api.post<ServiceRequest>(`/requests/${request.request_id}/convert/`, {
            type_id: Number(typeId),
            priority,
            note: note.trim() || null,
          })
          onDone()
          if (done.work_order_id) navigate(`/work-orders/${done.work_order_id}`)
          return `${done.wo_number} created from ${done.request_number}.`
        }
        if (decision === 'link') {
          await api.post(`/requests/${request.request_id}/link/`, {
            work_order_id: Number(workOrderId),
            note: note.trim() || null,
          })
          onDone()
          return 'Request linked to the existing work order.'
        }
        await api.post(`/requests/${request.request_id}/reject/`, { note: note.trim() })
        onDone()
        return 'Request rejected.'
      }}
    >
      <Field label="Decision" required>
        <SelectInput value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
          <option value="convert">Create a new work order</option>
          <option value="link">Same problem as a work order that is already open</option>
          <option value="reject">Reject (not a fault, or already fixed)</option>
        </SelectInput>
      </Field>

      {decision === 'convert' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maintenance type" required>
            <SelectInput required value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">Select a type...</option>
              {types.data?.map((t) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Priority" required>
            <SelectInput value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      )}

      {decision === 'link' && (
        <Field
          label="Open work order on this asset"
          required
          hint={openOrders.length === 0 && sameAsset.data ? 'This asset has no open work order. Create a new one instead.' : undefined}
        >
          <SelectInput required value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)}>
            <option value="">Select a work order...</option>
            {openOrders.map((w) => (
              <option key={w.work_order_id} value={w.work_order_id}>
                {w.wo_number} · {w.type_name} · {w.status}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      <Field
        label={decision === 'reject' ? 'Reason' : 'Note (optional)'}
        required={decision === 'reject'}
        hint={decision === 'reject' ? 'The technician sees this reason.' : undefined}
      >
        <TextArea required={decision === 'reject'} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </ActionModal>
  )
}
