import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api, errorMessage } from '../../api/client'
import { useToast } from '../ui/toast-context'
import Button from '../ui/Button'

/**
 * Runs the preventive check now (sp_run_preventive_check) - the same logic
 * the daily database event runs at 06:00.
 */
export default function RunCheckButton({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    try {
      const result = await api.post<{ alerts_created: number }>('/alerts/run-check/')
      toast.success(
        result.alerts_created > 0
          ? `Preventive check done: ${result.alerts_created} new alert(s) raised.`
          : 'Preventive check done: no new alerts.',
      )
      onDone?.()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button onClick={run} loading={running}>
      <RefreshCw size={16} />
      Run preventive check
    </Button>
  )
}
