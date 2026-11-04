import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { useToast } from '../ui/toast-context'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, TextInput } from '../ui/Field'

interface RuntimeModalProps {
  assetId: number
  currentHours: number
  onClose: () => void
  onDone: () => void
}

/** Records a new runtime-hours reading (sp_update_runtime). A database trigger raises alerts if a threshold is crossed. */
export default function RuntimeModal({ assetId, currentHours, onClose, onDone }: RuntimeModalProps) {
  const toast = useToast()
  const [hours, setHours] = useState(String(currentHours))
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/assets/${assetId}/runtime/`, { runtime_hours: Number(hours) })
      toast.success('Runtime hours updated. Any threshold alerts were raised by the database trigger.')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Update runtime hours"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="runtime-form" loading={saving}>
            Save reading
          </Button>
        </>
      }
    >
      <form id="runtime-form" onSubmit={submit}>
        <Field label="Total runtime hours" required hint={`Current reading: ${currentHours} h. Runtime can only go up.`}>
          <TextInput type="number" min={currentHours} step="0.1" required value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
