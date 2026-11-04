import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../ui/toast-context'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, SelectInput, TextInput } from '../ui/Field'
import type { LocationOption, ModelOption, SupplierOption } from '../../api/types'

interface AssetFormModalProps {
  onClose: () => void
  onSaved: () => void
}

const empty = {
  asset_tag: '',
  serial_number: '',
  model_id: '',
  supplier_id: '',
  location_id: '',
  purchase_date: '',
  purchase_cost: '',
  warranty_expiry: '',
  runtime_hours: '0',
}

/** "Register asset" form. Saving calls sp_register_asset. */
export default function AssetFormModal({ onClose, onSaved }: AssetFormModalProps) {
  const toast = useToast()
  const models = useFetch<ModelOption[]>('/lookups/models/')
  const locations = useFetch<LocationOption[]>('/lookups/locations/')
  const suppliers = useFetch<SupplierOption[]>('/lookups/suppliers/')

  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  function set(field: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const asset = await api.post<{ asset_tag: string }>('/assets/', {
        asset_tag: form.asset_tag.trim(),
        serial_number: form.serial_number.trim(),
        model_id: Number(form.model_id),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        location_id: Number(form.location_id),
        purchase_date: form.purchase_date,
        purchase_cost: Number(form.purchase_cost),
        warranty_expiry: form.warranty_expiry || null,
        runtime_hours: Number(form.runtime_hours || 0),
      })
      toast.success(`Asset ${asset.asset_tag} registered.`)
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Register new asset"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="asset-form" loading={saving}>
            Register asset
          </Button>
        </>
      }
    >
      <form id="asset-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset tag" required hint="Hospital inventory tag, e.g. MA-0012">
          <TextInput required value={form.asset_tag} onChange={(e) => set('asset_tag', e.target.value)} />
        </Field>
        <Field label="Serial number" required hint="Must be unique">
          <TextInput required value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />
        </Field>

        <Field label="Model" required>
          <SelectInput required value={form.model_id} onChange={(e) => set('model_id', e.target.value)}>
            <option value="">Select a model...</option>
            {models.data?.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Supplier">
          <SelectInput value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)}>
            <option value="">None</option>
            {suppliers.data?.map((s) => (
              <option key={s.vendor_id} value={s.vendor_id}>
                {s.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Location" required>
            <SelectInput required value={form.location_id} onChange={(e) => set('location_id', e.target.value)}>
              <option value="">Select a department / room...</option>
              {locations.data?.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field label="Purchase date" required>
          <TextInput type="date" required value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} />
        </Field>
        <Field label="Purchase cost (PHP)" required>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            required
            value={form.purchase_cost}
            onChange={(e) => set('purchase_cost', e.target.value)}
          />
        </Field>
        <Field label="Warranty expiry">
          <TextInput type="date" value={form.warranty_expiry} onChange={(e) => set('warranty_expiry', e.target.value)} />
        </Field>
        <Field label="Current runtime hours">
          <TextInput
            type="number"
            min="0"
            step="0.1"
            value={form.runtime_hours}
            onChange={(e) => set('runtime_hours', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  )
}
