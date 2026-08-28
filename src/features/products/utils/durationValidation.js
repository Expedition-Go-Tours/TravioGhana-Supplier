const MINUTES_PER = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
}

export function toMinutes(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return 0
  const factor = MINUTES_PER[unit] || MINUTES_PER.minutes
  return Number(value) * factor
}

export function productDurationMinutes(duration, durationUnit) {
  if (duration == null || Number.isNaN(Number(duration))) return null
  const total = toMinutes(duration, durationUnit || 'hours')
  return total > 0 ? total : null
}

export function sumStopMinutes(locations) {
  if (!Array.isArray(locations)) return 0
  return locations.reduce((sum, loc) => {
    if (!loc || loc.timeSpent == null || Number.isNaN(Number(loc.timeSpent))) return sum
    const factor = MINUTES_PER[loc.timeSpentUnit] || MINUTES_PER.minutes
    return sum + Number(loc.timeSpent) * factor
  }, 0)
}

export function stopDurationsExceedProduct(locations, duration, durationUnit) {
  const productMin = productDurationMinutes(duration, durationUnit)
  if (productMin == null) return false
  return sumStopMinutes(locations) > productMin
}

export function formatMinutes(minutes) {
  const m = Math.round(minutes)
  if (m <= 0) return '0m'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}m`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}m`
}