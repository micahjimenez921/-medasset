/**
 * The only place that talks to the Django API.
 * Paths are written without the "/api" prefix, e.g. api.get('/dashboard/').
 * Vite proxies /api to Django (see vite.config.ts).
 */

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Turns anything thrown into a readable message for toasts and error boxes. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

async function request<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${url}`, {
    method,
    credentials: 'same-origin', // the sign-in cookie is HttpOnly: the browser sends it, our code never sees it
    headers: {
      // required by the server on every change (blocks cross-site request forgery)
      'X-Requested-With': 'MedAsset',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    // Django sends {"detail": "..."}; for rule violations this is the stored procedure's own message.
    const detail = (data as { detail?: string } | null)?.detail
    // session ended (timeout, signed out elsewhere): send the user to the sign-in page
    if (response.status === 401 && !url.startsWith('/auth/login')) {
      window.dispatchEvent(new Event('medasset:unauthorized'))
    }
    throw new ApiError(detail ?? `Request failed (${response.status})`, response.status)
  }

  if (method === 'POST') {
    // lets the top bar (alert count) and other parts refresh after any change
    window.dispatchEvent(new Event('medasset:data-changed'))
  }
  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown = {}) => request<T>('POST', url, body),
}
