import DataTable from '../ui/DataTable'
import type { Column } from '../ui/DataTable'
import { Badge } from '../ui/StatusBadge'
import Button from '../ui/Button'
import { formatDateTime } from '../../lib/format'
import type { UserRow } from '../../api/types'

interface UserTableProps {
  users: UserRow[]
  selfId: number
  onEdit: (u: UserRow) => void
  onReset: (u: UserRow) => void
  onUnlock: (u: UserRow) => void
}

export default function UserTable({ users, selfId, onEdit, onReset, onUnlock }: UserTableProps) {
  const columns: Column<UserRow>[] = [
    {
      header: 'User',
      cell: (u) => (
        <div>
          <p className="font-medium text-slate-900">
            {u.full_name} {u.user_id === selfId && <span className="text-xs font-normal text-slate-500">(you)</span>}
          </p>
          <p className="text-xs text-slate-500">{u.username}</p>
        </div>
      ),
      csv: (u) => `${u.full_name} (${u.username})`,
    },
    { header: 'Role', cell: (u) => <Badge tone={u.role_name === 'Administrator' ? 'violet' : u.role_name === 'Technician' ? 'sky' : 'slate'}>{u.role_name}</Badge>, csv: (u) => u.role_name },
    {
      header: 'Status',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={u.is_active ? 'green' : 'slate'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge>
          {!!u.is_locked && <Badge tone="red">Locked</Badge>}
          {!!u.must_change_password && <Badge tone="amber">Temp password</Badge>}
        </div>
      ),
      csv: (u) => (u.is_active ? 'Active' : 'Deactivated'),
    },
    { header: 'Last sign-in', cell: (u) => <span className="text-slate-600">{u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</span>, csv: (u) => u.last_login_at },
    { header: 'Created by', cell: (u) => <span className="text-xs text-slate-500">{u.created_by}</span>, csv: (u) => u.created_by },
    {
      header: '',
      cell: (u) => (
        <div className="flex justify-end gap-1.5">
          {!!u.is_locked && (
            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => onUnlock(u)}>
              Unlock
            </Button>
          )}
          {u.user_id !== selfId && !!u.is_active && (
            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => onReset(u)}>
              Reset password
            </Button>
          )}
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => onEdit(u)}>
            Edit
          </Button>
        </div>
      ),
    },
  ]

  return <DataTable columns={columns} rows={users} rowKey={(u) => u.user_id} pageSize={10} exportName="medasset-users" empty="No users." />
}
