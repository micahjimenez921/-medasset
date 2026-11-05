import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import ErrorBox from '../components/ui/ErrorBox'
import Skeleton from '../components/ui/Skeleton'
import { Card } from '../components/ui/Card'
import AssetFilters from '../components/assets/AssetFilters'
import AssetTable from '../components/assets/AssetTable'
import AssetFormModal from '../components/assets/AssetFormModal'
import type { Asset, DepartmentOption } from '../api/types'
import Can from '../components/auth/Can'

export default function AssetsPage() {
  // filters live in the URL (?search=...&status=...&department_id=...) so links and the top-bar search work
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const department = params.get('department_id') ?? ''

  const [text, setText] = useState(search)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => setText(search), [search])

  // wait 300 ms after typing stops, then put the text in the URL
  useEffect(() => {
    if (text === search) return
    const timer = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (text) next.set('search', text)
          else next.delete('search')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => window.clearTimeout(timer)
  }, [text, search, setParams])

  function setParam(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const query = new URLSearchParams()
  if (search) query.set('search', search)
  if (status) query.set('status', status)
  if (department) query.set('department_id', department)
  const qs = query.toString()

  const assets = useFetch<Asset[]>(`/assets/${qs ? `?${qs}` : ''}`)
  const departments = useFetch<DepartmentOption[]>('/lookups/departments/')

  return (
    <>
      <PageHeader
        title="Assets"
        subtitle="Every medical device, its location and its operational status"
        actions={
          <Can permission="asset.create">
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              Register asset
            </Button>
          </Can>
        }
      />

      <Card>
        <AssetFilters
          text={text}
          onText={setText}
          status={status}
          onStatus={(v) => setParam('status', v)}
          department={department}
          onDepartment={(v) => setParam('department_id', v)}
          departments={departments.data ?? []}
        />

        {assets.error && !assets.data && (
          <div className="p-4">
            <ErrorBox message={assets.error} onRetry={assets.reload} />
          </div>
        )}
        {assets.loading && !assets.data && (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {assets.data && <AssetTable assets={assets.data} />}
      </Card>

      {showForm && (
        <AssetFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            assets.reload()
          }}
        />
      )}
    </>
  )
}
