import { useState } from 'react'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextInput } from '../ui/Field'
import type { Asset, MaintenanceTypeOption } from '../../api/types'

interface ScheduleFormModalProps {
  onClose: () => void
  onDone: () => void
}

/** Creates a preventive-maintenance schedule (sp_create_schedule). */
export default function ScheduleFormModal({ onClose, onDone }: ScheduleFormModalProps) {
  const assets = useFetch<Asset[]>('/assets/')
  const types = useFetch<MaintenanceTypeOption[]>('/lookups/maintenance_types/')

  const [assetId, setAssetId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [basis, setBasis] = useState<'CALENDAR' | 'RUNTIME'>('CALENDAR')
  const [days, setDays] = useState('180')
  const [hours, setHours] = useState('500')
  const [leadDays, setLeadDays] = useState('14')
  const [leadHours, setLeadHours] = useState('50')
  const [lastDone, setLastDone] = useState('')

  const usableAssets = (assets.data ?? []).filter((a) => a.status !== 'Decommissioned')
  // corrective repairs are not scheduled - only preventive types make sense here
  const scheduleTypes = (types.data ?? []).filter((t) => t.is_preventive === 1)
  const calendar = basis === 'CALENDAR'

  return (
    <ActionModal
      title="New maintenance schedule"
      description="Each asset can have one schedule per maintenance type."
      submitLabel="Create schedule"
      size="lg"
      onClose={onClose}
      onSubmit={async () => {
        await api.post('/schedules/', {
          asset_id: Number(assetId),
          type_id: Number(typeId),
          basis,
          interval_days: calendar ? Number(days) : null,
          interval_hours: calendar ? null : Number(hours),
          lead_days: Number(leadDays),
          lead_hours: Number(leadHours),
          last_performed: calendar ? lastDone || null : null,
        })
        onDone()
        return 'Schedule created. If it is already due soon, an alert was raised right away.'
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Asset" required>
            <SelectInput required value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Select an asset...</option>
              {usableAssets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.asset_tag} · {a.manufacturer} {a.model_name} ({formatHours(a.runtime_hours)})
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field label="Maintenance type" required>
          <SelectInput required value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Select a type...</option>
            {scheduleTypes.map((t) => (
              <option key={t.type_id} value={t.type_id}>
                {t.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Repeats based on" required>
          <SelectInput value={basis} onChange={(e) => setBasis(e.target.value as 'CALENDAR' | 'RUNTIME')}>
            <option value="CALENDAR">Calendar (every N days)</option>
            <option value="RUNTIME">Runtime (every N operating hours)</option>
          </SelectInput>
        </Field>

        {calendar ? (
          <>
            <Field label="Interval (days)" required hint="Next due = last performed date (or today) + interval">
              <TextInput type="number" min="1" step="1" required value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
            <Field label="Last performed" hint="Leave empty to count from today">
              <TextInput type="date" value={lastDone} onChange={(e) => setLastDone(e.target.value)} />
            </Field>
            <Field label="Alert lead time (days)" hint="Raise an alert this many days before it is due">
              <TextInput type="number" min="0" step="1" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Interval (hours)" required hint="Next due = the asset's current runtime + interval">
              <TextInput type="number" min="1" step="1" required value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <Field label="Alert lead time (hours)" hint="Raise an alert this many hours before it is due">
              <TextInput type="number" min="0" step="1" value={leadHours} onChange={(e) => setLeadHours(e.target.value)} />
            </Field>
          </>
        )}
      </div>
    </ActionModal>
  )
}

function formatHours(value: number): string {
  return `${new Intl.NumberFormat('en-PH').format(value)} h`
}
