export const ACCOMMODATION_TYPES = [
  { value: 'budget', label: 'Budget hotel', stars: '2 stars' },
  { value: 'midrange', label: 'Midrange hotel', stars: '3 stars' },
  { value: 'premium', label: 'Premium hotel', stars: '4–5 stars' },
]

export const ACCOMMODATION_VALUES = ACCOMMODATION_TYPES.map((t) => t.value)

export const ACCOMMODATION_LABELS = ACCOMMODATION_TYPES.reduce((acc, t) => {
  acc[t.value] = `${t.label} (${t.stars})`
  return acc
}, {})

export function isMultiDayTour(duration, durationUnit) {
  return durationUnit === 'days' && typeof duration === 'number' && duration > 1
}

export function dayCountForDuration(duration, durationUnit) {
  return isMultiDayTour(duration, durationUnit) ? Math.ceil(duration) : 1
}

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Brunch', 'Lunch or dinner, depending on starting time']

export const MEAL_FORMATS_BY_TYPE = {
  'Breakfast': ['Buffet', 'Continental', 'Full meal', 'Light breakfast', 'Pastry', 'Packed meal'],
  'Lunch': ['Buffet', 'Full meal', 'Food tasting', 'Light lunch', 'Packed meal', 'Picnic'],
  'Dinner': ['BBQ', 'Buffet', 'Fine dining', 'Food tasting', 'Full meal', 'Light dinner'],
  'Brunch': ['Buffet', 'Food tasting', 'Full meal', 'Light meal'],
  'Lunch or dinner, depending on starting time': ['Buffet', 'Full meal', 'Food tasting', 'Light meal'],
}
