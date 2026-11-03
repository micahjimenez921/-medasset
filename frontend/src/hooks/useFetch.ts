import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'

/**
 * Loads data from the API when the component appears (and whenever `url` changes).
 * Returns the data, a loading flag, an error message and a reload() function.
 * Pass null as the url to skip loading.
 */
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(url !== null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (url === null) return
    let cancelled = false
    setLoading(true)
    api
      .get<T>(url)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [url, tick])

  return { data, loading, error, reload }
}
