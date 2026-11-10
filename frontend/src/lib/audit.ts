/** Helpers that turn the JSON written by the audit triggers into readable changes. */

export interface FieldChange {
  field: string
  from: unknown
  to: unknown
}

function parse(text: string | null): Record<string, unknown> {
  if (!text) return {}
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Fields that changed (UPDATE), or all recorded fields (INSERT / DELETE). */
export function describeChanges(action: string, oldText: string | null, newText: string | null): FieldChange[] {
  const before = parse(oldText)
  const after = parse(newText)

  if (action === 'INSERT') {
    return Object.entries(after).map(([field, to]) => ({ field, from: undefined, to }))
  }
  if (action === 'DELETE') {
    return Object.entries(before).map(([field, from]) => ({ field, from, to: undefined }))
  }
  return Object.keys(after)
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, from: before[field], to: after[field] }))
}

export function humanField(field: string): string {
  return field.replace(/_/g, ' ')
}

export function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** One-line text version, used for the CSV export. */
export function changesToText(changes: FieldChange[], action: string): string {
  if (changes.length === 0) return 'No tracked field changed'
  return changes
    .map((c) =>
      action === 'UPDATE'
        ? `${humanField(c.field)}: ${showValue(c.from)} -> ${showValue(c.to)}`
        : `${humanField(c.field)}: ${showValue(action === 'DELETE' ? c.from : c.to)}`,
    )
    .join('; ')
}

export const TABLE_LABELS: Record<string, string> = {
  assets: 'Asset',
  work_orders: 'Work order',
  work_order_assignments: 'Labor assignment',
  work_order_parts: 'Part used',
  maintenance_schedules: 'Schedule',
  parts: 'Spare part',
  users: 'User account',
  role_permissions: 'Role permission',
}
