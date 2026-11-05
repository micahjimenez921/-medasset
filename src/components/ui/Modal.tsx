import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** wider dialog, for forms with two columns */
  wide?: boolean
  /** older name for `wide` */
  size?: 'md' | 'lg'
  /**
   * Buttons shown in a bar under the content. When given, the content is padded for you;
   * point a submit button at a form inside the dialog with  <Button type="submit" form="my-form-id">.
   */
  footer?: ReactNode
}

/**
 * A dialog on top of the page. Render it only while it should be visible
 * ({show && <Modal ...>}) - that also resets any form inside it every time it opens.
 */
export default function Modal({ title, onClose, children, wide = false, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const large = wide || size === 'lg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full rounded-xl bg-white shadow-xl ${large ? 'max-w-2xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {footer ? (
          <>
            <div className="p-5">{children}</div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
