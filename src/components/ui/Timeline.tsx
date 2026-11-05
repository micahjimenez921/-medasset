import type { ReactNode } from 'react'

export interface TimelineItem {
  id: string | number
  title: ReactNode
  detail?: string | null
  meta: string
}

/** A vertical list of events, newest first, with a dot and a line on the left. */
export default function Timeline({ items, empty = 'No history yet.' }: { items: TimelineItem[]; empty?: string }) {
  if (items.length === 0) return <p className="px-5 py-6 text-sm text-slate-500">{empty}</p>

  return (
    <ol className="px-5 py-4">
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}
          <span className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-teal-600 bg-white" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">{item.title}</div>
            {item.detail && <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p>}
            <p className="mt-0.5 text-xs text-slate-400">{item.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
