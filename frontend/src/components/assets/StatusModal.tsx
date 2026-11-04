import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { useToast } from '../ui/toast-context'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, SelectInput, TextInput } from '../ui/Field'
import type { AssetStatus } from '../../api/types'

interface StatusModalProps {
  assetId: number
  currentStatus: AssetStatus
  onClose: () => void
  onDone: () => void
}

/** Switches an asset between In-Use and Repair (sp_update_asset_status). Retiring is a separate action. */
export default function StatusModal({ assetId, currentStatus, onClose, onDone }: StatusModalProps) {
  const toast = useToast()
  const options = (['In-Use', 'Repair'] as const).filter((s) => s !== currentStatus)
  const [status, setStatus] = useState<string>(options[0] ?? 'In-Use')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/assets/${assetId}/status/`, { status, remarks: remarks.trim() || null })
      toast.success(`Status changed to ${status}.`)
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Change operational status"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="status-form" loading={saving}>
            Save status
          </Button>
        </>
      }
    >
      <form id="status-form" onSubmit={submit} className="space-y-4">
        <Field label="New status" required>
          <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Remarks" hint="Recorded in the status history">
          <TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
