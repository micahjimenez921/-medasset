import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { ToastContext } from './toast-context'
import type { ToastApi } from './toast-context'

type Kind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: Kind
  message: string
}

const styles: Record<Kind, string> = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  error: 'border-red-500 bg-red-50 text-red-900',
  info: 'border-sky-500 bg-sky-50 text-sky-900',
}

const titles: Record<Kind, string> = {
  success: 'Success',
  error: 'Action blocked',
  info: 'Notice',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++
      setToasts((list) => [...list, { id, kind, message }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 p-3 shadow-lg ${styles[t.kind]}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{titles[t.kind]}</p>
              <p className="mt-0.5 break-words text-sm">{t.message}</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
