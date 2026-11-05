import { createContext, useContext } from 'react'
import type { AuthUser } from '../api/types'

export interface AuthApi {
  /** undefined while we are still asking the server who is signed in */
  user: AuthUser | null | undefined
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  /** true when the signed-in user's role includes this permission code */
  can: (permission: string) => boolean
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
