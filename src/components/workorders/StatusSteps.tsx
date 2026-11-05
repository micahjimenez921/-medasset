import { Check } from 'lucide-react'
import type { WorkOrderStatus } from '../../api/types'

const STEPS: WorkOrderStatus[] = ['Open', 'Assigned', 'In Progress', 'Completed']

/**
 * Shows where a work order is in its life cycle: Open → Assigned → In Progress → Completed.
 * The database enforces this order with a trigger - a step cannot be skipped.
 */
export default function StatusSteps({ status }: { status: WorkOrderStatus }) {
  const cancelled = status === 'Cancelled'
  const current = STEPS.indexOf(status)

  return (
    <div>
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const done = !cancelled && (i < current || status === 'Completed')
          const active = !cancelled && i === current && status !== 'Completed'
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-teal-700 text-white'
                      : active
                        ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check size={16} /> : i + 1}
                </span>
                <span className={`text-xs font-medium ${done || active ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`mx-2 mb-5 h-0.5 flex-1 ${done ? 'bg-teal-700' : 'bg-slate-200'}`} />
              )}
            </li>
          )
        })}
      </ol>
      {cancelled && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          This work order was cancelled.
        </p>
      )}
    </div>
  )
}
