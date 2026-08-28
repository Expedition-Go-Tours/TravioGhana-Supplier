export function getUniqueCities(locations) {
  if (!locations || locations.length === 0) return []
  const seen = new Set()
  const cities = []
  for (const loc of locations) {
    const city = loc?.city?.trim()
    if (city && !seen.has(city.toLowerCase())) {
      seen.add(city.toLowerCase())
      cities.push(city)
    }
  }
  return cities
}

export function getLocationSummary(locations) {
  const cities = getUniqueCities(locations)
  if (cities.length === 0) return ''
  return cities.join(', ')
}
