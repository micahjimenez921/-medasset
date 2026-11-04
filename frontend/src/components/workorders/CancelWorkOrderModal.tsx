import { useState } from 'react'
import { api } from '../../api/client'
import ActionModal from '../ui/ActionModal'
import { Field, TextArea } from '../ui/Field'

interface CancelWorkOrderModalProps {
  workOrderId: number
  onClose: () => void
  onDone: () => void
}

/** Cancels the work order (sp_cancel_work_order). Refused if parts were already used on it. */
export default function CancelWorkOrderModal({ workOrderId, onClose, onDone }: CancelWorkOrderModalProps) {
  const [reason, setReason] = useState('')

  return (
    <ActionModal
      title="Cancel work order"
      description="A cancelled work order is kept for the audit record but cannot be reopened. Any alert linked to it goes back to the alert queue."
      submitLabel="Cancel work order"
      danger
      onClose={onClose}
      onSubmit={async () => {
        await api.post(`/work-orders/${workOrderId}/cancel/`, { reason: reason.trim() })
        onDone()
        return 'Work order cancelled.'
      }}
    >
      <Field label="Reason" required>
        <TextArea required value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ActionModal>
  )
}
