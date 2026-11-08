import { useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import Skeleton from '../components/ui/Skeleton'
import { Card, CardHeader } from '../components/ui/Card'
import TechnicianTable from '../components/technicians/TechnicianTable'
import TechnicianFormModal from '../components/technicians/TechnicianFormModal'
import type { TechnicianDialog } from '../components/technicians/TechnicianFormModal'
import type { TechnicianListData } from '../api/types'

/** Administrator page: staff technicians (can sign in) and external technicians (never sign in). */
export default function TechniciansPage() {
  const list = useFetch<TechnicianListData>('/technicians/')
  const [dialog, setDialog] = useState<TechnicianDialog | null>(null)

  if (list.error && !list.data) return <ErrorBox message={list.error} onRetry={list.reload} />

  const staff = list.data?.technicians.filter((t) => t.kind === 'Staff') ?? []
  const external = list.data?.technicians.filter((t) => t.kind === 'External') ?? []
  const accounts = list.data?.available_accounts ?? []

  return (
    <>
      <PageHeader
        title="Technicians"
        subtitle="Who performs maintenance work. Staff technicians can sign in. External technicians (contractors and manufacturer engineers) never sign in; hospital staff record their hours and service report."
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'staff-new' })} disabled={accounts.length === 0}>
              <UserPlus size={16} />
              Add staff profile
            </Button>
            <Button onClick={() => setDialog({ kind: 'external-new' })}>
              <Plus size={16} />
              Add external technician
            </Button>
          </>
        }
      />

      {!list.data ? (
        <Card>
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Staff technicians" />
            <TechnicianTable rows={staff} onEdit={(t) => setDialog({ kind: 'edit', technician: t })} />
          </Card>
          <Card>
            <CardHeader title="External technicians" />
            <TechnicianTable rows={external} onEdit={(t) => setDialog({ kind: 'edit', technician: t })} />
          </Card>
          {accounts.length > 0 && (
            <p className="text-sm text-amber-700">
              {accounts.length} Technician {accounts.length === 1 ? 'account has' : 'accounts have'} no technician profile
              yet, so {accounts.length === 1 ? 'it' : 'they'} cannot be assigned to work orders. Use "Add staff profile".
            </p>
          )}
        </div>
      )}

      {dialog && (
        <TechnicianFormModal dialog={dialog} accounts={accounts} onClose={() => setDialog(null)} onDone={list.reload} />
      )}
    </>
  )
}
