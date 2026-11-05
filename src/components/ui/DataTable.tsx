import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Button from './Button'
import Skeleton from './Skeleton'

export interface Column<T> {
  header: string
  /** what to draw in the cell */
  cell: (row: T) => ReactNode
  /** plain value used for the CSV export; columns without it are left out of the file */
  csv?: (row: T) => string | number | null | undefined
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | null | undefined
  rowKey: (row: T) => string | number
  loading?: boolean
  onRowClick?: (row: T) => void
  pageSize?: number
  /** file name (without .csv); when given, an "Export CSV" button is shown */
  exportName?: string
  /** text shown when there are no rows (`empty` is a shorter alias) */
  emptyMessage?: string
  empty?: string
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv<T>(columns: Column<T>[], rows: T[], name: string) {
  const cols = columns.filter((c) => c.csv)
  const lines = [
    cols.map((c) => csvCell(c.header)).join(','),
    ...rows.map((row) => cols.map((c) => csvCell(c.csv?.(row))).join(',')),
  ]
  // the BOM makes Excel read the file as UTF-8
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** A table with loading placeholders, an empty state, client-side pagination and optional CSV export. */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  pageSize = 10,
  exportName,
  emptyMessage,
  empty,
}: DataTableProps<T>) {
  const noRowsText = empty ?? emptyMessage ?? 'Nothing to show.'
  const [page, setPage] = useState(0)
  const all = rows ?? []
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = all.slice(current * pageSize, current * pageSize + pageSize)
  const from = all.length === 0 ? 0 : current * pageSize + 1
  const to = Math.min(all.length, (current + 1) * pageSize)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.header} className={`whitespace-nowrap px-4 py-3 ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.header} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer transition hover:bg-slate-50' : ''}
                >
                  {columns.map((c) => (
                    <td key={c.header} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && all.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                  {noRowsText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
        <span>
          {all.length === 0 ? 'No entries' : `Showing ${from}–${to} of ${all.length} entries`}
        </span>
        <div className="flex items-center gap-2">
          {exportName && (
            <Button
              variant="secondary"
              className="!px-3 !py-1.5"
              disabled={all.length === 0}
              onClick={() => downloadCsv(columns, all, exportName)}
            >
              <Download size={14} />
              Export CSV
            </Button>
          )}
          <Button
            variant="secondary"
            className="!px-2 !py-1.5"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="tabular-nums">
            {current + 1} / {pageCount}
          </span>
          <Button
            variant="secondary"
            className="!px-2 !py-1.5"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
