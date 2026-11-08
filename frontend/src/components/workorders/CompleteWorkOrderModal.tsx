import { useState } from 'react'
import { api } from '../../api/client'
import ActionModal from '../ui/ActionModal'
import { Field, SelectInput, TextArea, TextInput } from '../ui/Field'

interface CompleteWorkOrderModalProps {
  workOrderId: number
  isCalibration: boolean
  isPreventive: boolean
  /** true when an external technician (contractor / manufacturer) worked on this job */
  hasExternal: boolean
  onClose: () => void
  onDone: () => void
}

/**
 * Closes the work order (sp_complete_work_order). The procedure refuses if no labor was logged,
 * and a calibration also needs a result. After completion the work order is locked for good.
 */
export default function CompleteWorkOrderModal({
  workOrderId,
  isCalibration,
  isPreventive,
  hasExternal,
  onClose,
  onDone,
}: CompleteWorkOrderModalProps) {
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState('Pass')
  const [certificate, setCertificate] = useState('')
  const [serviceReport, setServiceReport] = useState('')

  return (
    <ActionModal
      title="Complete work order"
      description="Once completed, this work order can no longer be changed. It becomes part of the permanent audit record."
      submitLabel="Complete work order"
      onClose={onClose}
      onSubmit={async () => {
        await api.post(`/work-orders/${workOrderId}/complete/`, {
          resolution_notes: notes.trim(),
          calibration_result: isCalibration ? result : null,
          certificate_no: isCalibration ? certificate.trim() || null : null,
          service_report_no: hasExternal ? serviceReport.trim() : null,
        })
        onDone()
        return isPreventive
          ? 'Work order completed. The maintenance schedule rolled forward and its alerts were resolved.'
          : 'Work order completed. The asset is back in use.'
      }}
    >
      <Field label="Resolution notes" required hint="What was found and what was done?">
        <TextArea required value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {hasExternal && (
        <Field
          label="Service report number"
          required
          hint="From the paperwork of the external technician. It links this record to their invoice."
        >
          <TextInput required value={serviceReport} onChange={(e) => setServiceReport(e.target.value)} placeholder="e.g. MM-SR-2026-040" />
        </Field>
      )}

      {isCalibration && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Calibration result" required>
            <SelectInput value={result} onChange={(e) => setResult(e.target.value)}>
              <option>Pass</option>
              <option>Fail</option>
              <option>Adjusted</option>
            </SelectInput>
          </Field>
          <Field label="Certificate number">
            <TextInput value={certificate} onChange={(e) => setCertificate(e.target.value)} placeholder="e.g. CAL-2026-0150" />
          </Field>
        </div>
      )}
    </ActionModal>
  )
}
