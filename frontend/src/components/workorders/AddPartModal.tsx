import { useState } from 'react'
import { api } from '../../api/client'
import { useFetch } from '../../hooks/useFetch'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextInput } from '../ui/Field'
import { formatPeso } from '../../lib/format'
import type { PartOption } from '../../api/types'

interface AddPartModalProps {
  workOrderId: number
  onClose: () => void
  onDone: () => void
}

/**
 * Records a replaced component (sp_add_part_to_work_order).
 * The procedure reduces the stock and saves the part in ONE transaction - both happen or neither does.
 */
export default function AddPartModal({ workOrderId, onClose, onDone }: AddPartModalProps) {
  const parts = useFetch<PartOption[]>('/lookups/parts/')
  const [partId, setPartId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const selected = parts.data?.find((p) => String(p.part_id) === partId)

  return (
    <ActionModal
      title="Add replaced part"
      submitLabel="Add part"
      onClose={onClose}
      onSubmit={async () => {
        await api.post(`/work-orders/${workOrderId}/part/`, {
          part_id: Number(partId),
          quantity: Number(quantity),
        })
        onDone()
        return 'Part added and stock reduced.'
      }}
    >
      <Field label="Spare part" required>
        <SelectInput required value={partId} onChange={(e) => setPartId(e.target.value)}>
          <option value="">Select a part...</option>
          {parts.data?.map((p) => (
            <option key={p.part_id} value={p.part_id} disabled={p.quantity_on_hand === 0}>
              {p.name} ({p.part_number}) · {p.quantity_on_hand} in stock {p.unit_cost !== null ? `· ${formatPeso(p.unit_cost)}` : ''}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field
        label="Quantity"
        required
        hint={selected ? `${selected.quantity_on_hand} in stock.${selected.unit_cost !== null ? ` Estimated cost: ${formatPeso(selected.unit_cost * (Number(quantity) || 0))}` : ''}` : undefined}
      >
        <TextInput type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>

      {selected?.is_low_stock ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This part is at or below its reorder level.</p>
      ) : null}
    </ActionModal>
  )
}
