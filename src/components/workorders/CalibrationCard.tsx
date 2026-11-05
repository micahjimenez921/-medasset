import { Card, CardHeader } from '../ui/Card'
import StatusBadge from '../ui/StatusBadge'
import { formatDate } from '../../lib/format'
import type { CalibrationRecord } from '../../api/types'

/** The calibration certificate record written when a calibration work order is completed. */
export default function CalibrationCard({ calibration }: { calibration: CalibrationRecord }) {
  return (
    <Card>
      <CardHeader title="Calibration record" subtitle="Kept for compliance audits" />
      <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Result</dt>
          <dd className="mt-1">
            <StatusBadge value={calibration.result} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Calibrated on</dt>
          <dd className="mt-1 text-sm text-slate-900">{formatDate(calibration.calibrated_on)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Certificate no.</dt>
          <dd className="mt-1 text-sm text-slate-900">{calibration.certificate_no ?? '—'}</dd>
        </div>
      </dl>
    </Card>
  )
}
