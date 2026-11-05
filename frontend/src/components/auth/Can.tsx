import type { ReactNode } from 'react'
import { useAuth } from '../../auth/auth-context'

/** Shows its children only when the signed-in user has the permission.
 *  This only tidies the screen - the database refuses the action anyway. */
export default function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth()
  return can(permission) ? <>{children}</> : null
}
