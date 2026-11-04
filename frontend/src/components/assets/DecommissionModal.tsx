import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { useToast } from '../ui/toast-context'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextArea } from '../ui/Field'

interface DecommissionModalProps {
  assetId: number
  assetTag: string
  onClose: () => void
  onDone: () => void
}

/** Permanently retires an asset (sp_decommission_asset). The procedure refuses if work orders are still open. */
export default function DecommissionModal({ assetId, assetTag, onClose, onDone }: DecommissionModalProps) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/assets/${assetId}/decommission/`, { reason: reason.trim() })
      toast.success(`${assetTag} has been decommissioned.`)
      onDone()
    } catch (err) {
      // e.g. "Close or cancel the open work orders first."  - this text comes from the stored procedure
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Decommission ${assetTag}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="decommission-form" variant="danger" loading={saving}>
            Decommission
          </Button>
        </>
      }
    >
      <form id="decommission-form" onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          This cannot be undone. A decommissioned asset becomes read-only, its schedules are paused and its open alerts are
          resolved.
        </p>
        <Field label="Reason" required>
          <TextArea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. End of life, beyond economical repair" />
        </Field>
      </form>
    </Modal>
  )
}
