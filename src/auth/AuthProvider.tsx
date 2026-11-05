import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { AuthContext } from './auth-context'
import type { AuthApi } from './auth-context'

/** Knows who is signed in. The server is the source of truth: we only keep a copy for the screens. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<AuthUser>('/auth/me/'))
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // any 401 from the API (idle timeout, signed out elsewhere) lands here
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('medasset:unauthorized', onUnauthorized)
    return () => window.removeEventListener('medasset:unauthorized', onUnauthorized)
  }, [])

  const value = useMemo<AuthApi>(
    () => ({
      user,
      refresh,
      async login(username, password) {
        const me = await api.post<AuthUser>('/auth/login/', { username, password })
        setUser(me)
        return me
      },
      async logout() {
        try {
          await api.post('/auth/logout/')
        } finally {
          setUser(null)
        }
      },
      can: (permission) => !!user && user.permissions.includes(permission),
    }),
    [user, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
