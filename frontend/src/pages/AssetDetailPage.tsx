import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, ClipboardPlus, Gauge, Power, Repeat } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import Skeleton from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Timeline from '../components/ui/Timeline'
import { Card, CardHeader } from '../components/ui/Card'
import AssetInfoCard from '../components/assets/AssetInfoCard'
import AssetSchedules from '../components/assets/AssetSchedules'
import RuntimeModal from '../components/assets/RuntimeModal'
import TransferModal from '../components/assets/TransferModal'
import StatusModal from '../components/assets/StatusModal'
import DecommissionModal from '../components/assets/DecommissionModal'
import CreateWorkOrderModal from '../components/workorders/CreateWorkOrderModal'
import WorkOrderTable from '../components/workorders/WorkOrderTable'
import { formatDate, formatDateTime } from '../lib/format'
import type { AssetDetail } from '../api/types'

type ModalName = 'runtime' | 'transfer' | 'status' | 'decommission' | 'workorder' | null

export default function AssetDetailPage() {
  const { id } = useParams()
  const { data, loading, error, reload } = useFetch<AssetDetail>(`/assets/${id}/`)
  const [modal, setModal] = useState<ModalName>(null)

  const back = (
    <Link to="/assets" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700">
      <ArrowLeft size={14} /> Back to assets
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
        <Skeleton className="mt-6 h-48 w-full" />
      </>
    )
  }

  if (!data) return null

  const { asset } = data
  const retired = asset.status === 'Decommissioned'

  function done() {
    setModal(null)
    reload()
  }

  return (
    <>
      {back}
      <PageHeader
        title={`${asset.asset_tag} · ${asset.manufacturer} ${asset.model_name}`}
        subtitle={`Serial ${asset.serial_number}`}
        actions={
          <>
            <StatusBadge value={asset.status} />
            {!retired && (
              <>
                <Button onClick={() => setModal('workorder')}>
                  <ClipboardPlus size={16} /> New work order
                </Button>
                <Button variant="secondary" onClick={() => setModal('runtime')}>
                  <Gauge size={16} /> Runtime
                </Button>
                <Button variant="secondary" onClick={() => setModal('transfer')}>
                  <ArrowRightLeft size={16} /> Transfer
                </Button>
                <Button variant="secondary" onClick={() => setModal('status')}>
                  <Repeat size={16} /> Status
                </Button>
                <Button variant="danger" onClick={() => setModal('decommission')}>
                  <Power size={16} /> Decommission
                </Button>
              </>
            )}
          </>
        }
      />

      {retired && (
        <div className="mb-6 rounded-xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-700">
          <p className="font-semibold">This asset was decommissioned on {formatDate(asset.decommissioned_at)}.</p>
          <p className="mt-1">Reason: {asset.decommission_reason}. Records are read-only for audit purposes.</p>
        </div>
      )}

      <div className="space-y-6">
        <AssetInfoCard asset={asset} />
        <AssetSchedules schedules={data.schedules} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Location history" subtitle="Every department transfer, logged by a database trigger" />
            <Timeline
              empty="This asset has never been moved."
              items={data.transfers.map((t) => ({
                id: t.transfer_id,
                title: `${t.from_location} → ${t.to_location}`,
                detail: t.reason,
                meta: `${formatDateTime(t.transferred_at)} · ${t.transferred_by}`,
              }))}
            />
          </Card>
          <Card>
            <CardHeader title="Status history" subtitle="In-Use, Repair and Decommissioned changes" />
            <Timeline
              items={data.status_history.map((h) => ({
                id: h.history_id,
                title: h.old_status ? (
                  <span className="inline-flex items-center gap-2">
                    <StatusBadge value={h.old_status} /> → <StatusBadge value={h.new_status} />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Registered as <StatusBadge value={h.new_status} />
                  </span>
                ),
                detail: h.remarks,
                meta: `${formatDateTime(h.changed_at)} · ${h.changed_by}`,
              }))}
            />
          </Card>
        </div>

        <Card>
          <CardHeader title="Work order history" subtitle="Maintenance, calibration and repairs with their costs" />
          <WorkOrderTable workOrders={data.work_orders} showAsset={false} pageSize={5} />
        </Card>
      </div>

      {modal === 'runtime' && (
        <RuntimeModal assetId={asset.asset_id} currentHours={asset.runtime_hours} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'transfer' && (
        <TransferModal assetId={asset.asset_id} currentLocationId={asset.location_id} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'status' && (
        <StatusModal assetId={asset.asset_id} currentStatus={asset.status} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal === 'workorder' && (
        <CreateWorkOrderModal initial={{ assetId: asset.asset_id }} onClose={() => setModal(null)} />
      )}
      {modal === 'decommission' && (
        <DecommissionModal assetId={asset.asset_id} assetTag={asset.asset_tag} onClose={() => setModal(null)} onDone={done} />
      )}
    </>
  )
}
