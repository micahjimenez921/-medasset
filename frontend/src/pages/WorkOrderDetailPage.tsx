import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, PackagePlus, Play, UserPlus } from 'lucide-react'
import { api, errorMessage } from '../api/client'
import { useFetch } from '../hooks/useFetch'
import { useToast } from '../components/ui/toast-context'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import Skeleton from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { Card, CardHeader } from '../components/ui/Card'
import StatusSteps from '../components/workorders/StatusSteps'
import WorkOrderInfoCard from '../components/workorders/WorkOrderInfoCard'
import CostSummary from '../components/workorders/CostSummary'
import LaborTable from '../components/workorders/LaborTable'
import PartsTable from '../components/workorders/PartsTable'
import CalibrationCard from '../components/workorders/CalibrationCard'
import AssignTechnicianModal from '../components/workorders/AssignTechnicianModal'
import LogLaborModal from '../components/workorders/LogLaborModal'
import AddPartModal from '../components/workorders/AddPartModal'
import CompleteWorkOrderModal from '../components/workorders/CompleteWorkOrderModal'
import CancelWorkOrderModal from '../components/workorders/CancelWorkOrderModal'
import type { WorkOrderDetail } from '../api/types'
import Can from '../components/auth/Can'

type ModalName = 'assign' | 'labor' | 'part' | 'complete' | 'cancel' | null

export default function WorkOrderDetailPage() {
  const { id } = useParams()
  const { data, loading, error, reload } = useFetch<WorkOrderDetail>(`/work-orders/${id}/`)
  const toast = useToast()
  const [modal, setModal] = useState<ModalName>(null)
  const [starting, setStarting] = useState(false)

  const back = (
    <Link to="/work-orders" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700">
      <ArrowLeft size={14} /> Back to work orders
    </Link>
  )

  if (error && !data) {
    return (
      <>
        {back}
        <ErrorBox message={error} onRetry={reload} />
      </>
    )
  }

  if (loading && !data) {
    return (
      <>
        {back}
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-40 w-full" />
      </>
    )
  }

  if (!data) return null

  const { work_order: wo, labor, parts, calibration } = data
  const closed = wo.status === 'Completed' || wo.status === 'Cancelled'
  const preventive = wo.is_preventive === 1

  async function startWork() {
    setStarting(true)
    try {
      await api.post(`/work-orders/${wo.work_order_id}/start/`)
      toast.success(
        preventive
          ? 'Work started.'
          : 'Work started. A database trigger moved the asset to "Repair" status.',
      )
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setStarting(false)
    }
  }

  return (
    <>
      {back}
      <PageHeader
        title={wo.wo_number}
        subtitle={`${wo.type_name} · ${wo.asset_tag} ${wo.model_name}`}
        actions={
          <>
            <StatusBadge value={wo.priority} />
            <StatusBadge value={wo.status} />

            {!closed && (
              <Can permission="workorder.assign">
                <Button variant="secondary" onClick={() => setModal('assign')}>
                  <UserPlus size={16} /> Assign
                </Button>
              </Can>
            )}
            {wo.status === 'Assigned' && (
              <Can permission="workorder.execute">
                <Button onClick={startWork} loading={starting}>
                  <Play size={16} /> Start work
                </Button>
              </Can>
            )}
            {wo.status === 'In Progress' && (
              <>
                <Can permission="workorder.execute">
                  <Button variant="secondary" onClick={() => setModal('labor')}>
                    <Clock size={16} /> Log labor
                  </Button>
                  <Button variant="secondary" onClick={() => setModal('part')}>
                    <PackagePlus size={16} /> Add part
                  </Button>
                </Can>
                <Can permission="workorder.complete">
                  <Button onClick={() => setModal('complete')}>Complete</Button>
                </Can>
              </>
            )}
            {!closed && (
              <Can permission="workorder.cancel">
                <Button variant="danger" onClick={() => setModal('cancel')}>
                  Cancel
                </Button>
              </Can>
            )}
          </>
        }
      />

      {closed && (
        <div className="mb-6 rounded-xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
          This work order is <b>{wo.status.toLowerCase()}</b> and locked. The database rejects any further change to it,
          so the record stays valid for audits.
        </div>
      )}

      <Card className="mb-6 p-5">
        <StatusSteps status={wo.status} />
      </Card>

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WorkOrderInfoCard wo={wo} />
          </div>
          <CostSummary labor={wo.labor_cost} parts={wo.parts_cost} total={wo.total_cost} />
        </div>

        {calibration && <CalibrationCard calibration={calibration} />}

        <Card>
          <CardHeader title="Technicians and labor" subtitle="Hourly rates are saved at the time of assignment" />
          <LaborTable lines={labor} />
        </Card>

        <Card>
          <CardHeader title="Parts replaced" subtitle="Each entry also reduced the spare-parts stock" />
          <PartsTable lines={parts} />
        </Card>
      </div>

      {modal === 'assign' && (
        <AssignTechnicianModal
          workOrderId={wo.work_order_id}
          assignedIds={labor.map((l) => l.technician_id)}
          onClose={() => setModal(null)}
          onDone={reload}
        />
      )}
      {modal === 'labor' && (
        <LogLaborModal workOrderId={wo.work_order_id} labor={labor} onClose={() => setModal(null)} onDone={reload} />
      )}
      {modal === 'part' && (
        <AddPartModal workOrderId={wo.work_order_id} onClose={() => setModal(null)} onDone={reload} />
      )}
      {modal === 'complete' && (
        <CompleteWorkOrderModal
          workOrderId={wo.work_order_id}
          isCalibration={wo.is_calibration === 1}
          isPreventive={preventive}
          hasExternal={labor.some((l) => l.kind === 'External')}
          onClose={() => setModal(null)}
          onDone={reload}
        />
      )}
      {modal === 'cancel' && (
        <CancelWorkOrderModal workOrderId={wo.work_order_id} onClose={() => setModal(null)} onDone={reload} />
      )}
    </>
  )
}
