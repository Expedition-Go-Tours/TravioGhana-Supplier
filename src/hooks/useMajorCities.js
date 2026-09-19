import { useQuery } from '@tanstack/react-query'
import config from '@/config'

const apiBase = config.api.baseURL

/**
 * The curated major-city picklist (Ghana's 16 region capitals) from
 * `GET /places/cities`.
 *
 * Suppliers pick a city from this instead of accepting the geocoder's city,
 * which for Ghana addresses is often a district ("La-Dade-Kotopon Municipal
 * District") or a village. A canonical city is what search, the homepage
 * destination rail, and place listings all key on.
 */
async function fetchMajorCities() {
  const res = await fetch(`${apiBase}/places/cities`)
  if (!res.ok) throw new Error(`Cities API HTTP ${res.status}`)
  const body = await res.json()
  return Array.isArray(body?.data?.cities) ? body.data.cities : []
}

export function useMajorCities() {
  return useQuery({
    queryKey: ['places', 'cities'],
    queryFn: fetchMajorCities,
    staleTime: 60 * 60 * 1000,
  })
}
