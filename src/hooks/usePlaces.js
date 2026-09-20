import { useQuery } from '@tanstack/react-query'
import config from '@/config'

const apiBase = config.api.baseURL

/**
 * Searchable places autocomplete (cities, towns and attractions — the curated
 * XLSX import) from `GET /places/search`.
 *
 * `query` is the debounced text; empty/`<2` chars returns the default list
 * (major cities + most-booked places) so the picker is usable without typing.
 * `types` optionally restricts results to a subset of `city`/`town`/`attraction`
 * (server-side filter). Each place is `{ name, type, city, region, lat, lng }`.
 */
async function fetchPlaces(q, types) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('limit', '25')
  if (Array.isArray(types) && types.length > 0) params.set('types', types.join(','))
  const res = await fetch(`${apiBase}/places/search?${params.toString()}`)
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}`)
  const body = await res.json()
  return Array.isArray(body?.data?.places) ? body.data.places : []
}

export function usePlaces(query, types) {
  const q = (query || '').trim()
  const typesKey = Array.isArray(types) ? types.slice().sort().join(',') : ''
  return useQuery({
    queryKey: ['places', 'search', q, typesKey],
    queryFn: () => fetchPlaces(q, types),
    staleTime: 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  })
}
