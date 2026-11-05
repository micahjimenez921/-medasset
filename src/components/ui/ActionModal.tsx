import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import Button from './Button'
import Modal from './Modal'
import { useToast } from './toast-context'

interface ActionModalProps {
  title: string
  description?: string
  submitLabel: string
  danger?: boolean
  size?: 'md' | 'lg'
  onClose: () => void
  /** Do the work (call the API). Return a message to show as a success toast. Throw to show an error toast. */
  onSubmit: () => Promise<string | void>
  children: ReactNode
}

/**
 * A modal with a form, a Cancel button and a Submit button.
 * It handles the busy spinner and shows the database's own error message as a toast
 * when a stored procedure rejects the request - so each action modal only has to
 * supply its fields and the API call.
 */
export default function ActionModal({
  title,
  description,
  submitLabel,
  danger = false,
  size = 'md',
  onClose,
  onSubmit,
  children,
}: ActionModalProps) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const message = await onSubmit()
      if (message) toast.success(message)
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose} size={size}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {description && <p className="text-sm text-slate-600">{description}</p>}
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
