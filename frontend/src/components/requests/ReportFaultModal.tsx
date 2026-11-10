import { useState } from 'react'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextArea } from '../ui/Field'
import type { Asset, ServiceRequest } from '../../api/types'

interface ReportFaultModalProps {
  /** pre-select the asset (used from an asset page) */
  assetId?: number
  onClose: () => void
  onDone?: () => void
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

/** A technician reports a problem (sp_report_fault). The administrator decides what happens next. */
export default function ReportFaultModal({ assetId, onClose, onDone }: ReportFaultModalProps) {
  const assets = useFetch<Asset[]>('/assets/')
  const [asset, setAsset] = useState(assetId ? String(assetId) : '')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState('')

  const usable = (assets.data ?? []).filter((a) => a.status !== 'Decommissioned')

  return (
    <ActionModal
      title="Report a fault"
      description="This sends a request to the administrator, who reviews it and opens the work order."
      submitLabel="Send report"
      onClose={onClose}
      onSubmit={async () => {
        const created = await api.post<ServiceRequest>('/requests/', {
          asset_id: Number(asset),
          priority,
          description: description.trim(),
        })
        onDone?.()
        return `${created.request_number} sent for review.`
      }}
    >
      <Field label="Asset" required>
        <SelectInput required value={asset} onChange={(e) => setAsset(e.target.value)}>
          <option value="">Select an asset...</option>
          {usable.map((a) => (
            <option key={a.asset_id} value={a.asset_id}>
              {a.asset_tag} · {a.manufacturer} {a.model_name} ({a.department})
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="How urgent is it?" required>
        <SelectInput value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </SelectInput>
      </Field>

      <Field label="What is wrong?" required hint="What did you see or hear? When did it start?">
        <TextArea required value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
    </ActionModal>
  )
}
