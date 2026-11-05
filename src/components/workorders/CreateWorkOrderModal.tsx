import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field'
import type { Asset, MaintenanceTypeOption } from '../../api/types'

interface CreateWorkOrderModalProps {
  /** pre-fill the form (used when opened from an asset page or from an alert) */
  initial?: { assetId?: number; typeId?: number; alertId?: number; description?: string }
  onClose: () => void
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

/** Opens a new work order (sp_create_work_order) and jumps to its page. */
export default function CreateWorkOrderModal({ initial, onClose }: CreateWorkOrderModalProps) {
  const navigate = useNavigate()
  const assets = useFetch<Asset[]>('/assets/')
  const types = useFetch<MaintenanceTypeOption[]>('/lookups/maintenance_types/')

  const [assetId, setAssetId] = useState(initial?.assetId ? String(initial.assetId) : '')
  const [typeId, setTypeId] = useState(initial?.typeId ? String(initial.typeId) : '')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [scheduled, setScheduled] = useState('')

  const usableAssets = (assets.data ?? []).filter((a) => a.status !== 'Decommissioned')

  return (
    <ActionModal
      title="New work order"
      submitLabel="Create work order"
      size="lg"
      onClose={onClose}
      onSubmit={async () => {
        const created = await api.post<{ work_order_id: number; wo_number: string }>('/work-orders/', {
          asset_id: Number(assetId),
          type_id: Number(typeId),
          priority,
          description: description.trim(),
          scheduled_date: scheduled || null,
          alert_id: initial?.alertId ?? null,
        })
        navigate(`/work-orders/${created.work_order_id}`)
        return `${created.wo_number} created.`
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Asset" required>
            <SelectInput required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Select an asset...</option>
              {usableAssets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.asset_tag} · {a.manufacturer} {a.model_name} ({a.department})
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

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

        <div className="sm:col-span-2">
          <Field label="Description" required hint="What is wrong, or what needs to be done?">
            <TextArea required value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <Field label="Scheduled date">
          <TextInput type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
        </Field>
      </div>
    </ActionModal>
  )
}
