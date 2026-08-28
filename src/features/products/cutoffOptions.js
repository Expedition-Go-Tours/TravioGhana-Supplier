// Matches GetYourGuide's cut-off options: every 5 minutes for the first hour,
// then fixed hours up to 10. 0 allows bookings until the activity start time
// (or the end of the operating window). 90 is kept for legacy tours that saved
// it before the grid was tightened.
export const CUTOFF_OPTIONS = [
  { group: 'Minutes', items: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 90] },
  { group: 'Hours', items: [120, 180, 240, 300, 360, 420, 480, 540, 600] },
]

export function formatCutoffLabel(minutes) {
  if (minutes === 0) return '0 minutes'
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `${h} ${h === 1 ? 'Hour' : 'Hours'}`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} Minutes`
  return `${h} ${h === 1 ? 'Hour' : 'Hours'} ${m} Minutes`
}

// When does a slot stop accepting bookings? GYG's built-in guidance shows the
// wall-clock instant: slot start (or end of operating window) minus the cut-off.
// Cut-offs can't exceed 10h, so a wrap only ever lands on the previous day.
export function cutoffInstant(startTime, cutoffMinutes) {
  const [hh, mm] = (startTime || '00:00').split(':').map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return ''
  const total = hh * 60 + mm - Number(cutoffMinutes)
  const wrapped = ((total % 1440) + 1440) % 1440
  const h = String(Math.floor(wrapped / 60)).padStart(2, '0')
  const m = String(wrapped % 60).padStart(2, '0')
  return `${h}:${m}${total < 0 ? ' (previous day)' : ''}`
}
