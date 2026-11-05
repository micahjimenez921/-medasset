import { Fragment } from 'react'
import { Check, Minus } from 'lucide-react'
import type { RoleMatrixData } from '../../api/types'

/** Read-only table: which role has which permission, straight from the database. */
export default function RolesMatrix({ data }: { data: RoleMatrixData }) {
  const granted = new Set(data.grants.map((g) => `${g.role_id}:${g.permission_code}`))
  const categories = [...new Set(data.permissions.map((p) => p.category))]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Permission</th>
            {data.roles.map((r) => (
              <th key={r.role_id} className="px-4 py-3 text-center font-medium">
                <p>{r.name}</p>
                <p className="font-normal normal-case text-slate-400">
                  {r.active_users} active user{r.active_users === 1 ? '' : 's'}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <Fragment key={cat}>
              <tr className="bg-slate-50">
                <td colSpan={data.roles.length + 1} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {cat}
                </td>
              </tr>
              {data.permissions
                .filter((p) => p.category === cat)
                .map((p) => (
                  <tr key={p.code} className="border-b border-slate-50">
                    <td className="px-4 py-2">
                      <p className="text-slate-900">{p.description}</p>
                      <p className="font-mono text-xs text-slate-400">{p.code}</p>
                    </td>
                    {data.roles.map((r) => (
                      <td key={r.role_id} className="px-4 py-2 text-center">
                        {granted.has(`${r.role_id}:${p.code}`) ? (
                          <Check size={16} className="mx-auto text-emerald-600" aria-label="allowed" />
                        ) : (
                          <Minus size={16} className="mx-auto text-slate-300" aria-label="not allowed" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
