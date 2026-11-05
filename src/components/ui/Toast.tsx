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

// solid colours so a message is noticed immediately
const styles: Record<Kind, string> = {
  success: 'border-emerald-800 bg-emerald-600 text-white',
  error: 'border-red-800 bg-red-600 text-white',
  info: 'border-sky-800 bg-sky-600 text-white',
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
      window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4500)
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
      {/* top-centre: where the user is already looking, above any open dialog */}
      <div className="pointer-events-none fixed left-1/2 top-5 z-[100] flex w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`toast-in pointer-events-auto flex items-start gap-3 rounded-xl border-b-4 px-4 py-3 shadow-2xl ${styles[t.kind]}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{titles[t.kind]}</p>
              <p className="mt-0.5 break-words text-sm font-medium leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 opacity-80 hover:bg-white/20 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
