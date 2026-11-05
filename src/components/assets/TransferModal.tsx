import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../ui/toast-context'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, SelectInput, TextInput } from '../ui/Field'
import type { LocationOption } from '../../api/types'

interface TransferModalProps {
  assetId: number
  currentLocationId: number
  onClose: () => void
  onDone: () => void
}

/** Moves the asset to another department/room (sp_transfer_asset). The transfer is logged by a trigger. */
export default function TransferModal({ assetId, currentLocationId, onClose, onDone }: TransferModalProps) {
  const toast = useToast()
  const locations = useFetch<LocationOption[]>('/lookups/locations/')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/assets/${assetId}/transfer/`, { to_location_id: Number(to), reason: reason.trim() || null })
      toast.success('Asset transferred and logged.')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Transfer asset"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="transfer-form" loading={saving}>
            Transfer
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-4">
        <Field label="Move to" required>
          <SelectInput required value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select a department / room...</option>
            {locations.data
              ?.filter((l) => l.location_id !== currentLocationId)
              .map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.label}
                </option>
              ))}
          </SelectInput>
        </Field>
        <Field label="Reason" hint="Shown in the asset's location history">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Emergency shift coverage" />
        </Field>
      </form>
    </Modal>
  )
}
