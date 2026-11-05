import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

/** Shows a temporary password exactly once. It is never stored in readable form, so it cannot be shown again. */
export default function TempPasswordModal({
  username,
  password,
  onClose,
}: {
  username: string
  password: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal title="Temporary password" onClose={onClose}>
      <div className="space-y-4 p-5">
        <p className="text-sm text-slate-600">
          Give this password to <strong>{username}</strong> in person or by phone. It is shown only once, and they must
          choose their own password when they first sign in.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all rounded-lg bg-slate-100 px-3 py-2.5 text-center font-mono text-lg tracking-wider text-slate-900">
            {password}
          </code>
          <Button type="button" variant="secondary" onClick={copy} aria-label="Copy password">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>I have noted it</Button>
        </div>
      </div>
    </Modal>
  )
}
